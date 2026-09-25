// Standalone regression checks using existing Vite and Node; no test framework.
// Run from frontend-web: node scripts/verify-processing.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'vite';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
async function waitUntil(predicate, label) {
  const deadline = Date.now() + 8000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Timed out: ' + label);
    await delay(10);
  }
}

async function verify(app, port) {
  const server = await createServer({
    root: path.join(repository, app), configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: { port } }, appType: 'custom',
  });
  const sessions = [];
  try {
    const load = (feature, file) => server.ssrLoadModule('/src/features/' + feature + '/' + file + '.ts');
    const { transcriptService } = await load('transcript', 'transcriptService');
    const { translationService } = await load('translation', 'translationService');
    const { narrationService } = await load('voice', 'narrationService');
    const { createNarrationConfig } = await load('voice', 'voiceUtils');
    const { generationService } = await load('processing', 'generationService');
    const { processingService } = await load('processing', 'processingService');
    const utils = await load('processing', 'processingUtils');
    const { mockProcessingScenario } = await load('processing', 'mockProcessingScenario');
    const id = 'project-009';

    for (const [value, expected] of [[-5, 0], [137, 100], [NaN, 0], [Infinity, 0], [42.6, 43]]) {
      assert.equal(utils.clampProgress(value), expected);
    }
    assert.equal(utils.calculateOverallProgress([]), 0);
    assert.equal(await generationService.getContext(id, 'en'), null);
    async function seed(projectId) {
      const transcript = await transcriptService.saveTranscript(projectId, await transcriptService.generateTranscript(projectId));
      const target = transcript.languageCode === 'en' ? 'vi' : 'en';
      const translation = await translationService.save(projectId, await translationService.translate(projectId, transcript, target));
      const config = await narrationService.saveConfig(projectId, { ...createNarrationConfig(translation), voiceId: target === 'en' ? 'voice-en-jenny' : 'voice-vi-linh', speed: 1.2 });
      const context = await generationService.getContext(projectId, target);
      assert.ok(context);
      assert.deepEqual(context.config, config);
      return context;
    }
    const context = await seed(id);
    const original = JSON.stringify(context);
    function create(contextToUse = context, onUpdate = () => {}) {
      const events = [];
      const session = processingService.createSession(contextToUse, (snapshot) => {
        events.push(snapshot);
        onUpdate(snapshot);
      }, { tickMs: 2 });
      sessions.push(session);
      return { session, events };
    }
    const { session, events } = create();
    assert.deepEqual(session.getStatus().stages.slice(0, 4).map((stage) => stage.status), Array(4).fill('COMPLETED'));
    assert.equal(session.getStatus().progress, 0);
    const firstStart = session.start();
    const duplicateStart = session.start();
    await Promise.all([firstStart, duplicateStart]);
    await waitUntil(() => session.getStatus().status === 'COMPLETED', 'successful pipeline');
    assert.equal(events.filter((event) => event.status === 'STARTING').length, 1);
    assert.equal(session.getStatus().progress, 100);
    assert.ok(session.getStatus().stages.every((stage) => stage.status === 'COMPLETED'));
    assert.ok(events.some((event) => event.currentStage === 'narration'));
    assert.ok(events.some((event) => event.currentStage === 'media'));
    assert.ok(events.every((event, index) => Number.isFinite(event.progress) && event.progress >= 0 &&
      event.progress <= 100 && (index === 0 || event.progress >= events[index - 1].progress)));
    const modifiedSnapshot = session.getStatus();
    modifiedSnapshot.stages[0].status = 'FAILED';
    assert.equal(session.getStatus().stages[0].status, 'COMPLETED');
    assert.equal(JSON.stringify(context), original);
    assert.ok(!('audioPath' in session.getStatus()) && !('downloadUrl' in session.getStatus()));

    for (const failAt of ['start', 'narration', 'media']) {
      const { session: failing, events: failedEvents } = create();
      await failing.start({ failAt });
      await waitUntil(() => failing.getStatus().status === 'FAILED', failAt + ' failure');
      assert.equal(failing.getStatus().error.stage, failAt);
      const stoppedCount = failedEvents.length;
      await delay(30);
      assert.equal(failedEvents.length, stoppedCount);
      await failing.retry({ failAt: 'start' });
      assert.equal(failing.getStatus().status, 'FAILED');
      assert.equal(failing.getStatus().progress, 0);
      await failing.retry();
      await waitUntil(() => failing.getStatus().status === 'COMPLETED', 'retry after ' + failAt);
      assert.equal(failing.getStatus().error, null);
    }
    mockProcessingScenario.failFirstAttemptAt = 'media';
    const { session: scenario } = create();
    await scenario.start();
    await waitUntil(() => scenario.getStatus().status === 'FAILED', 'manual failure scenario');
    await scenario.retry();
    await waitUntil(() => scenario.getStatus().status === 'COMPLETED', 'manual scenario retry');
    mockProcessingScenario.failFirstAttemptAt = null;

    const { session: cancelStarting, events: cancelledEvents } = create();
    const pending = cancelStarting.start();
    cancelStarting.cancel();
    assert.equal(cancelStarting.getStatus().status, 'CANCELLED');
    const cancelCount = cancelledEvents.length;
    await pending;
    await delay(30);
    assert.equal(cancelledEvents.length, cancelCount);
    await cancelStarting.retry();
    await waitUntil(() => cancelStarting.getStatus().status === 'COMPLETED', 'restart after cancellation');

    let cancelActive;
    const cancelledRun = create(context, (snapshot) => {
      if (snapshot.status === 'PROCESSING' && snapshot.progress >= 15) cancelActive.cancel();
    });
    cancelActive = cancelledRun.session;
    await cancelActive.start();
    await waitUntil(() => cancelActive.getStatus().status === 'CANCELLED', 'cancel active timer');
    const frozen = JSON.stringify(cancelActive.getStatus());
    await delay(50);
    assert.equal(JSON.stringify(cancelActive.getStatus()), frozen);

    let disposeActive;
    let disposed = false;
    const disposedRun = create(context, (snapshot) => {
      if (snapshot.status === 'PROCESSING' && snapshot.progress >= 15) {
        disposed = true;
        disposeActive.dispose();
      }
    });
    disposeActive = disposedRun.session;
    await disposeActive.start();
    await waitUntil(() => disposed, 'dispose active timer');
    const disposeCount = disposedRun.events.length;
    await delay(50);
    await disposeActive.start();
    assert.equal(disposedRun.events.length, disposeCount);

    const { session: disposeStarting, events: disposedStartingEvents } = create();
    const loading = disposeStarting.start();
    disposeStarting.dispose();
    await loading;
    await delay(30);
    assert.equal(disposedStartingEvents.length, 1);

    await narrationService.saveConfig(id, { ...context.config, speed: 1.5 });
    const { session: stale } = create();
    await stale.start();
    assert.equal(stale.getStatus().status, 'FAILED');
    assert.equal(stale.getStatus().error.stage, 'start');
    assert.match(stale.getStatus().error.message, /settings changed/);

    const audioContext = await seed('project-006');
    const { session: audio } = create(audioContext);
    assert.equal(audio.getStatus().stages.at(-1).title, 'Audio Processing');
    await audio.start();
    await waitUntil(() => audio.getStatus().status === 'COMPLETED', 'audio pipeline');
    assert.equal(utils.getSimulatedProjectStatus(audio.getStatus(), 'AUDIO'), 'COMPLETED');
    console.log(app + ': PASS - context, progress, duplicate start, all failures/retries, cancel/dispose cleanup, stale settings, audio path, immutable snapshots, no output files');
  } finally {
    sessions.forEach((session) => session.dispose());
    await server.close();
  }
}

await Promise.all([verify('frontend-web', 24681), verify('frontend-mobile', 24682)]);
