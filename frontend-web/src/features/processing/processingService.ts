import { generationService } from './generationService';
import { mockProcessingScenario } from './mockProcessingScenario';
import { calculateOverallProgress, clampProgress, copySnapshot, createInitialSnapshot, isProcessing, sameConfiguration } from './processingUtils';
import type { FailureStage, GenerationContext, ProcessingSession, ProcessingSnapshot, RunOptions } from './types';

export const processingService = {
  createSession(context: GenerationContext, onUpdate: (snapshot: ProcessingSnapshot) => void, options: { tickMs?: number } = {}): ProcessingSession {
    const projectId = context.project.id;
    const mediaType = context.project.mediaType;
    const config = { ...context.config };
    let snapshot = createInitialSnapshot(projectId, mediaType);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let validation: AbortController | null = null;
    let epoch = 0;
    let attempts = 0;
    let disposed = false;
    const requestedTick = options.tickMs ?? mockProcessingScenario.tickMs;
    const tickMs = Number.isFinite(requestedTick) ? Math.max(1, requestedTick) : 350;

    function clearPending() {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      validation?.abort();
      validation = null;
    }
    function emit() {
      if (!disposed) onUpdate(copySnapshot(snapshot));
    }
    function fail(stage: FailureStage, message: string) {
      clearPending();
      snapshot = { ...snapshot, status: 'FAILED', error: { stage, message }, message,
        stages: snapshot.stages.map((item) => item.id === stage ? { ...item, status: 'FAILED' } : item) };
      emit();
    }
    function advance(token: number, failAt: FailureStage | null) {
      if (disposed || token !== epoch || snapshot.status !== 'PROCESSING' || !snapshot.currentStage) return;
      const stageId = snapshot.currentStage;
      const active = snapshot.stages.find((stage) => stage.id === stageId);
      const progress = clampProgress((active?.progress ?? 0) + 10);
      snapshot = { ...snapshot, stages: snapshot.stages.map((stage) => stage.id === stageId ? { ...stage, progress } : stage) };
      snapshot.progress = calculateOverallProgress(snapshot.stages);
      if (failAt === stageId && progress >= 60) { fail(stageId, 'Mock processing failure. Retry to restart the simulation.'); return; }
      if (progress === 100) {
        snapshot.stages = snapshot.stages.map((stage) => stage.id === stageId ? { ...stage, status: 'COMPLETED' } : stage);
        if (stageId === 'narration') {
          snapshot.currentStage = 'media';
          snapshot.stages = snapshot.stages.map((stage) => stage.id === 'media' ? { ...stage, status: 'PROCESSING', progress: 0 } : stage);
          snapshot.message = mediaType === 'VIDEO' ? 'Simulating video processing...' : 'Simulating audio processing...';
        } else {
          snapshot = { ...snapshot, status: 'COMPLETED', currentStage: null, progress: 100, completedAt: new Date().toISOString(),
            message: 'Simulation complete. No narration audio or final media file was generated.' };
          clearPending();
          emit();
          return;
        }
      }
      emit();
      // The subscriber may synchronously cancel/dispose during an update.
      if (!disposed && token === epoch && snapshot.status === 'PROCESSING') {
        timer = setTimeout(() => advance(token, failAt), tickMs);
      }
    }
    async function begin(runOptions: RunOptions = {}) {
      if (disposed || isProcessing(snapshot)) return;
      clearPending();
      const token = ++epoch;
      const failAt = runOptions.failAt === undefined ? (attempts === 0 ? mockProcessingScenario.failFirstAttemptAt : null) : runOptions.failAt;
      attempts += 1;
      snapshot = { ...createInitialSnapshot(projectId, mediaType), status: 'STARTING',
        runId: projectId + '-mock-' + attempts, message: 'Checking your saved configuration...' };
      const controller = new AbortController();
      validation = controller;
      emit();
      if (disposed || token !== epoch) return;
      try {
        const latest = await generationService.getContext(projectId, config.languageCode, { signal: controller.signal });
        if (disposed || controller.signal.aborted || token !== epoch) return;
        if (!latest || !sameConfiguration(config, latest.config)) {
          fail('start', 'Your saved settings changed or are unavailable. Return to Voice Settings, review and save them, then reopen Generate.');
          return;
        }
        if (failAt === 'start') { fail('start', 'Mock start failure. Retry to restart the simulation.'); return; }
        snapshot = { ...snapshot, status: 'PROCESSING', currentStage: 'narration', startedAt: new Date().toISOString(),
          message: 'Simulating narration generation...',
          stages: snapshot.stages.map((stage) => stage.id === 'narration' ? { ...stage, status: 'PROCESSING', progress: 0 } : stage) };
        emit();
        if (!disposed && token === epoch && snapshot.status === 'PROCESSING') timer = setTimeout(() => advance(token, failAt), tickMs);
      } catch {
        if (!disposed && !controller.signal.aborted && token === epoch) fail('start', 'Unable to start the simulation. Please retry or review Voice Settings.');
      }
    }
    return {
      getStatus: () => copySnapshot(snapshot),
      start: begin,
      retry: async (runOptions) => {
        if (snapshot.status !== 'FAILED' && snapshot.status !== 'CANCELLED') return;
        await begin(runOptions);
      },
      cancel: () => {
        if (disposed || !isProcessing(snapshot)) return;
        ++epoch;
        clearPending();
        snapshot = { ...snapshot, status: 'CANCELLED', message: 'Simulation cancelled. No background processing is running.',
          stages: snapshot.stages.map((stage) => stage.status === 'PROCESSING' ? { ...stage, status: 'CANCELLED' } : stage) };
        emit();
      },
      dispose: () => { disposed = true; ++epoch; clearPending(); },
    };
  },
};
