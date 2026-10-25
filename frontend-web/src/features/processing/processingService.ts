import { api } from '../../lib/api';
import { projectRepository } from '../projects/projectRepository';
import { copySnapshot, createInitialSnapshot, isProcessing, sameConfiguration } from './processingUtils';
import { generationService } from './generationService';
import { generationReadiness } from './generationReadiness';
import type { FailureStage, GenerationContext, ProcessingSession, ProcessingSnapshot, RunOptions } from './types';

export const processingService = {
  createSession(context: GenerationContext, onUpdate: (snapshot: ProcessingSnapshot) => void): ProcessingSession {
    const projectId = context.project.id;
    const mediaType = context.project.mediaType ?? 'AUDIO';
    const config = { ...context.config };
    let snapshot = createInitialSnapshot(projectId, mediaType);
    snapshot = { ...snapshot, message: 'Kiểm tra cấu hình rồi bắt đầu xử lý.', stages: snapshot.stages.map((stage) => stage.id === 'narration' ? { ...stage, status: 'COMPLETED', progress: 100, description: 'Âm thanh thuyết minh đã được máy chủ tạo.' } : stage) };
    const complete = () => {
      snapshot = { ...snapshot, status: 'COMPLETED', progress: 100, currentStage: null,
        message: mediaType === 'AUDIO' ? 'Tệp âm thanh đã được máy chủ xác nhận sẵn sàng. Không cần xử lý thêm.' : 'Kết quả video đã được máy chủ xác nhận sẵn sàng.',
        stages: snapshot.stages.map(stage => stage.id === 'media' ? { ...stage, status: 'COMPLETED', progress: 100, description: mediaType === 'AUDIO' ? 'Sử dụng trực tiếp tệp giọng đọc đã lưu.' : stage.description } : stage) };
    };
    if (generationReadiness(context).resultReady) complete();
    let disposed = false;

    const emit = () => { if (!disposed) onUpdate(copySnapshot(snapshot)); };
    const fail = (stage: FailureStage, message: string) => { snapshot = { ...snapshot, status: 'FAILED', currentStage: null, error: { stage, message }, message, stages: snapshot.stages.map((item) => item.id === stage ? { ...item, status: 'FAILED' } : item) }; emit(); };
    async function begin(_options: RunOptions = {}) {
      if (disposed || isProcessing(snapshot) || snapshot.status === 'COMPLETED') return;
      snapshot = { ...snapshot, status: 'STARTING', error: null, message: 'Đang xác minh cấu hình đã lưu...' }; emit();
      try {
        const latest = await generationService.getContext(projectId, config.languageCode);
        if (!latest || !sameConfiguration(config, latest.config) || !latest.config.narrationId) { fail('start', 'Cấu hình hoặc âm thanh thuyết minh không còn khả dụng. Vui lòng quay lại bước Giọng đọc.'); return; }
        const readiness = generationReadiness(latest);
        if (readiness.resultReady) { complete(); emit(); return; }
        if (!readiness.canStart || latest.project.mediaType !== mediaType) { fail('start', readiness.reason ?? 'Quy trình chưa cho phép tạo kết quả. Hãy kiểm tra lại trạng thái.'); return; }
        snapshot = { ...snapshot, status: 'PROCESSING', progress: 50, currentStage: 'media', startedAt: new Date().toISOString(), message: 'Máy chủ đang ghép âm thanh thuyết minh vào video...', stages: snapshot.stages.map((stage) => stage.id === 'media' ? { ...stage, status: 'PROCESSING', progress: 0 } : stage) }; emit();
        const response = await api<{ result: { id: string }; idempotent: boolean }>(`/projects/${projectId}/process`, { method: 'POST', body: JSON.stringify({ narrationId: latest.config.narrationId }) }, false);
        snapshot = { ...snapshot, runId: response.result.id, status: 'COMPLETED', progress: 100, currentStage: null, completedAt: new Date().toISOString(), message: response.idempotent ? 'Kết quả video đã tồn tại và sẵn sàng.' : 'Video thuyết minh đã được tạo thành công.', stages: snapshot.stages.map((stage) => stage.id === 'media' ? { ...stage, status: 'COMPLETED', progress: 100 } : stage) };
        await projectRepository.refresh(); emit();
      } catch (error) { fail('media', error instanceof Error ? error.message : 'Không thể xử lý video.'); }
    }
    return { getStatus: () => copySnapshot(snapshot), start: begin, retry: begin, cancel: () => undefined, dispose: () => { disposed = true; } };
  },
};
