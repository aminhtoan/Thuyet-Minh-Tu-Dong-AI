import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, writeFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import test from 'node:test';
import mongoose from 'mongoose';
import { connectIsolatedMongo } from './helpers/isolated-mongo.js';

// Refuse before importing application models/config. No development DB fallback.
process.env.NODE_ENV = 'test';
const isolated = await connectIsolatedMongo();
await isolated.instance.disconnect();
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;
process.env.UPLOAD_DIR = `.tmp/s30-results-${randomUUID()}`;
const { Project } = await import('../src/models/Project.js');
const { Media } = await import('../src/models/Media.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { Translation } = await import('../src/models/Translation.js');
const { Narration } = await import('../src/models/Narration.js');
const { Result } = await import('../src/models/Result.js');
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const service = await import('../src/services/result.service.js');
const { setMediaProcessorForTests } = await import('../src/services/media-processing/media-processing.service.js');
const { uploadRoot } = await import('../src/utils/file.js');
const ids: mongoose.Types.ObjectId[] = [];

const good = { async probe() { return { duration: 1, fileSize: 4, format: 'mp4', hasVideo: true, hasAudio: true }; }, async composeNarration(input: { outputPath: string }) { await writeFile(input.outputPath, new Uint8Array([0, 0, 0, 4])); return { duration: 1, fileSize: 4, format: 'mp4', hasVideo: true, hasAudio: true, width: 32, height: 32, mimeType: 'video/mp4' as const }; } };
async function fixture() {
  const owner = new mongoose.Types.ObjectId();
  const project = await Project.create({ userId: owner, name: 'S30 isolated fixture', sourceLanguage: 'vi', status: 'GENERATING_AUDIO' }); ids.push(project._id);
  const dir = resolve(uploadRoot, 'projects', String(project._id)); await mkdir(dir, { recursive: true });
  const source = resolve(dir, 'source.mp4'), audio = resolve(dir, 'narration.mp3'); await writeFile(source, 'fixture'); await writeFile(audio, 'fixture');
  await Media.create({ projectId: project._id, originalName: 'fixture.mp4', fileName: 'source.mp4', mediaType: 'VIDEO', mimeType: 'video/mp4', fileSize: 7, storagePath: relative(uploadRoot, source) });
  const transcript = await Transcript.create({ projectId: project._id, languageCode: 'vi', fullText: 'Isolated fixture', status: 'READY', revision: 1 });
  const translation = await Translation.create({ projectId: project._id, transcriptId: transcript._id, sourceLanguage: 'vi', targetLanguage: 'en', fullText: 'Isolated fixture', status: 'READY', revision: 1, sourceTranscriptRevision: 1 });
  const narration = await Narration.create({ projectId: project._id, translationId: translation._id, voiceId: new mongoose.Types.ObjectId(), languageCode: 'en', speed: 1, audioPath: relative(uploadRoot, audio), mimeType: 'audio/mpeg', fileSize: 7, provider: 'mock', model: 'mock', status: 'READY', revision: 1, sourceTranslationRevision: 1 });
  return { owner: String(owner), projectId: String(project._id), narrationId: String(narration._id), dir };
}
test('isolated replica-set Result lifecycle, failures, durable guards and cleanup', async t => {
  await mongoose.connect(process.env.TEST_MONGODB_URI!, { autoIndex: false, autoCreate: false });
  const models = [Project, Media, Transcript, Translation, Narration, Result, ProcessingJob, ActivityLog];
  try {
    for (const model of models) await model.createCollection();
    await ProcessingJob.createIndexes(); await Result.createIndexes();
    setMediaProcessorForTests(good);
    await t.test('successful transaction, idempotent replay and protected CURRENT artifact access', async () => {
      const f = await fixture();
      const first = await service.process(f.projectId, f.owner, f.narrationId).catch(error => {
        // Isolated fixture only. Do not include live database errors in responses.
        const cause = (error as Error & { cause?: Error }).cause;
        console.info('ISOLATED_RESULT_FAILURE', cause?.name);
        throw error;
      });
      assert.equal(first.project.status, 'COMPLETED'); assert.equal((await Project.findById(f.projectId))?.status, 'COMPLETED');
      assert.equal((await ProcessingJob.findOne({ projectId: f.projectId }))?.status, 'COMPLETED');
      assert.equal((await service.process(f.projectId, f.owner, f.narrationId)).idempotent, true);
      const file = await service.getResultFile(f.projectId, first.result.id); assert.equal((await stat(file.path)).size, 4);
      await assert.rejects(service.process(f.projectId, new mongoose.Types.ObjectId().toString(), f.narrationId));
      await Transcript.updateOne({ projectId: f.projectId }, { $inc: { revision: 1 } });
      await assert.rejects(service.getResultFile(f.projectId, first.result.id), /provenance/);
    });
    await t.test('preparation failure terminates the newly claimed job without rendering', async () => {
      const f = await fixture(), original = Project.updateOne; let updates = 0, renders = 0;
      Project.updateOne = function (...args: any[]) {
        if (++updates === 1) throw new Error('private preparation failure');
        return original.apply(this, args as any);
      } as typeof Project.updateOne;
      setMediaProcessorForTests({ ...good, async composeNarration(input) { renders++; return good.composeNarration(input); } });
      try { await assert.rejects(service.process(f.projectId, f.owner, f.narrationId)); }
      finally { Project.updateOne = original; setMediaProcessorForTests(good); }
      assert.equal(renders, 0);
      assert.equal(await Result.countDocuments({ projectId: f.projectId }), 0);
      const job = await ProcessingJob.findOne({ projectId: f.projectId }).select('+diagnostics');
      assert.equal(job?.status, 'FAILED'); assert.equal(job?.diagnostics?.stage, 'PREPARE_OUTPUT');
    });
    await t.test('persistence failure rolls back Result, records safe diagnostics and deletes uncommitted output', async () => {
      const f = await fixture(), original = Result.create;
      Result.create = (async () => { throw new Error('private database exception'); }) as typeof Result.create;
      try { await assert.rejects(service.process(f.projectId, f.owner, f.narrationId), /Không thể xử lý video/); } finally { Result.create = original; }
      assert.equal(await Result.countDocuments({ projectId: f.projectId }), 0);
      const job = await ProcessingJob.findOne({ projectId: f.projectId }).select('+diagnostics');
      assert.equal(job?.status, 'FAILED'); assert.equal(job?.diagnostics?.stage, 'PERSIST_RESULT');
      assert.equal(JSON.stringify(job).includes('private database exception'), false);
      assert.equal((await ProcessingJob.findById(job!._id))?.diagnostics, undefined);
      assert.deepEqual(await readdir(resolve(f.dir, 'results')), []);
    });
    await t.test('invalid/missing output never completes and failed job is retained', async () => {
      const f = await fixture(); setMediaProcessorForTests({ ...good, async composeNarration(input) { await writeFile(input.outputPath, ''); return { ...await good.probe(), mimeType: 'video/mp4' as const, fileSize: 0 }; } });
      await assert.rejects(service.process(f.projectId, f.owner, f.narrationId));
      assert.equal((await Project.findById(f.projectId))?.status, 'FAILED'); assert.equal(await Result.countDocuments({ projectId: f.projectId }), 0);
      assert.equal((await ProcessingJob.findOne({ projectId: f.projectId }))?.errorMessage, 'MEDIA_PROCESSING_INVALID_OUTPUT');
      assert.deepEqual(await readdir(resolve(f.dir, 'results')), []); setMediaProcessorForTests(good);
    });
    await t.test('source revision changed during render rejects persistence and cleans output', async () => {
      const f = await fixture();
      setMediaProcessorForTests({ ...good, async composeNarration(input) {
        await Transcript.updateOne({ projectId: f.projectId }, { $inc: { revision: 1 } });
        return good.composeNarration(input);
      } });
      try { await assert.rejects(service.process(f.projectId, f.owner, f.narrationId)); }
      finally { setMediaProcessorForTests(good); }
      assert.equal(await Result.countDocuments({ projectId: f.projectId }), 0);
      const job = await ProcessingJob.findOne({ projectId: f.projectId }).select('+diagnostics');
      assert.equal(job?.status, 'FAILED');
      assert.equal(job?.diagnostics?.code, 'MEDIA_PROCESSING_SOURCE_CHANGED');
      assert.deepEqual(await readdir(resolve(f.dir, 'results')), []);
    });
    await t.test('confirmation failure after commit preserves completed job and valid artifact', async () => {
      const f = await fixture(), original = Result.findOne; let calls = 0;
      Result.findOne = function (...args: any[]) { if (++calls === 2) throw new Error('read confirmation failed'); return original.apply(this, args as any); } as typeof Result.findOne;
      try { await assert.rejects(service.process(f.projectId, f.owner, f.narrationId), error => {
        const cause = (error as Error & { cause?: Error }).cause;
        if (cause) console.info('ISOLATED_CONFIRMATION_FAILURE', cause.name);
        return error instanceof Error && error.message.includes('Video đã được lưu');
      }); } finally { Result.findOne = original; }
      const result = await Result.findOne({ projectId: f.projectId }); assert.ok(result);
      assert.equal((await Project.findById(f.projectId))?.status, 'COMPLETED'); assert.equal((await ProcessingJob.findOne({ projectId: f.projectId }))?.status, 'COMPLETED');
      assert.equal((await stat((await service.getResultFile(f.projectId, String(result._id))).path)).size, 4);
    });
    await t.test('concurrent duplicate calls dispatch processor once', async () => {
      const f = await fixture(); let calls = 0, release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
      setMediaProcessorForTests({ ...good, async composeNarration(input) { calls++; await gate; return good.composeNarration(input); } });
      const first = service.process(f.projectId, f.owner, f.narrationId);
      while (!calls) await new Promise(resolve => setTimeout(resolve, 5));
      try { await assert.rejects(service.process(f.projectId, f.owner, f.narrationId), /đang được xử lý/); } finally { release(); }
      await first.catch(error => { const cause = (error as Error & { cause?: Error }).cause; console.info('ISOLATED_CONCURRENT_FAILURE', cause?.name); throw error; }); assert.equal(calls, 1); setMediaProcessorForTests(good);
    });
  } finally {
    setMediaProcessorForTests();
    await new Promise(resolve => setTimeout(resolve, 100));
    for (const model of models) if (model !== Project && model !== ActivityLog) await model.deleteMany({ projectId: { $in: ids } });
    await ActivityLog.deleteMany({ entityId: { $in: ids } }); await Project.deleteMany({ _id: { $in: ids } });
    await mongoose.disconnect();
    const relativeRoot = relative(resolve(process.cwd(), '.tmp'), uploadRoot);
    assert.ok(relativeRoot.startsWith('s30-results-') && !relativeRoot.includes('..'));
    await rm(uploadRoot, { recursive: true, force: true });
  }
});
