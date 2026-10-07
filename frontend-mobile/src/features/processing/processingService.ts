import { resultService } from '../results/resultService';
import { projectRepository } from '../projects/projectRepository';
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
      if (!disposed) {
        if (snapshot.status === 'COMPLETED') resultService.record(context, snapshot);
        if (snapshot.status !== 'WAITING') projectRepository.update(projectId, {
          status: snapshot.status === 'COMPLETED' ? 'COMPLETED' : snapshot.status === 'FAILED' ? 'FAILED' :
            snapshot.status === 'CANCELLED' ? 'TRANSLATED' : snapshot.currentStage === 'media' ? 'PROCESSING_VIDEO' : 'GENERATING_AUDIO',
          progress: snapshot.status === 'CANCELLED' ? undefined : snapshot.progress,
          targetLanguage: config.languageCode, updatedAt: new Date().toISOString(),
        });
        onUpdate(copySnapshot(snapshot));
      }
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
      if (failAt === stageId && progress >= 60) { fail(stageId, 'Xử lý mô phỏng thất bại. Hãy thử lại để khởi động lại mô phỏng.'); return; }
      if (progress === 100) {
        snapshot.stages = snapshot.stages.map((stage) => stage.id === stageId ? { ...stage, status: 'COMPLETED' } : stage);
        if (stageId === 'narration') {
          snapshot.currentStage = 'media';
          snapshot.stages = snapshot.stages.map((stage) => stage.id === 'media' ? { ...stage, status: 'PROCESSING', progress: 0 } : stage);
          snapshot.message = mediaType === 'VIDEO' ? 'Đang mô phỏng xử lý video...' : 'Đang mô phỏng xử lý âm thanh...';
        } else {
          snapshot = { ...snapshot, status: 'COMPLETED', currentStage: null, progress: 100, completedAt: new Date().toISOString(),
            message: 'Mô phỏng hoàn tất. Không tạo âm thanh thuyết minh hoặc tệp phương tiện cuối cùng.' };
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
        runId: projectId + '-mock-' + attempts, message: 'Đang kiểm tra cấu hình đã lưu...' };
      const controller = new AbortController();
      validation = controller;
      emit();
      if (disposed || token !== epoch) return;
      try {
        const latest = await generationService.getContext(projectId, config.languageCode, { signal: controller.signal });
        if (disposed || controller.signal.aborted || token !== epoch) return;
        if (!latest || !sameConfiguration(config, latest.config)) {
          fail('start', 'Cấu hình đã lưu đã thay đổi hoặc không khả dụng. Hãy quay lại cấu hình Giọng đọc, kiểm tra và lưu, sau đó mở lại Tạo thuyết minh.');
          return;
        }
        if (failAt === 'start') { fail('start', 'Không thể bắt đầu mô phỏng. Hãy thử lại để khởi động lại.'); return; }
        snapshot = { ...snapshot, status: 'PROCESSING', currentStage: 'narration', startedAt: new Date().toISOString(),
          message: 'Đang mô phỏng tạo giọng đọc...',
          stages: snapshot.stages.map((stage) => stage.id === 'narration' ? { ...stage, status: 'PROCESSING', progress: 0 } : stage) };
        emit();
        if (!disposed && token === epoch && snapshot.status === 'PROCESSING') timer = setTimeout(() => advance(token, failAt), tickMs);
      } catch {
        if (!disposed && !controller.signal.aborted && token === epoch) fail('start', 'Không thể bắt đầu mô phỏng. Vui lòng thử lại hoặc kiểm tra cấu hình Giọng đọc.');
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
        snapshot = { ...snapshot, status: 'CANCELLED', message: 'Đã hủy mô phỏng. Không có xử lý nền nào đang chạy.',
          stages: snapshot.stages.map((stage) => stage.status === 'PROCESSING' ? { ...stage, status: 'CANCELLED' } : stage) };
        emit();
      },
      dispose: () => {
        if (isProcessing(snapshot)) projectRepository.update(projectId, { status: 'TRANSLATED', progress: undefined });
        disposed = true; ++epoch; clearPending(); },
    };
  },
};
