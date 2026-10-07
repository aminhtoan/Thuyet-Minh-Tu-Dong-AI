import type { MediaType, ProjectStatus } from '../projects/types';
import type { NarrationConfig } from '../voice/types';
import type { ProcessingSnapshot, ProcessingStage } from './types';

export function clampProgress(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}
export function calculateOverallProgress(stages: readonly ProcessingStage[]): number {
  const remainingWork = stages.filter((stage) => stage.id === 'narration' || stage.id === 'media');
  if (!remainingWork.length) return 0;
  return clampProgress(remainingWork.reduce((total, stage) => total +
    (stage.status === 'COMPLETED' ? 100 : clampProgress(stage.progress ?? 0)), 0) / remainingWork.length);
}
export function createInitialSnapshot(projectId: string, mediaType: MediaType): ProcessingSnapshot {
  return {
    projectId, runId: null, status: 'WAITING', progress: 0, currentStage: null,
    message: 'Kiểm tra cấu hình đã lưu, sau đó bắt đầu mô phỏng.',
    error: null, startedAt: null, completedAt: null,
    stages: [
      { id: 'upload', title: 'Tải lên', status: 'COMPLETED' },
      { id: 'transcript', title: 'Bản ghi', status: 'COMPLETED' },
      { id: 'translation', title: 'Bản dịch', status: 'COMPLETED' },
      { id: 'voice', title: 'Cấu hình giọng đọc', status: 'COMPLETED' },
      { id: 'narration', title: 'Tạo giọng đọc', status: 'WAITING', progress: 0 },
      { id: 'media', title: mediaType === 'VIDEO' ? 'Xử lý video' : 'Xử lý âm thanh', status: 'WAITING', progress: 0 },
    ],
  };
}
export function copySnapshot(snapshot: ProcessingSnapshot): ProcessingSnapshot {
  return { ...snapshot, stages: snapshot.stages.map((stage) => ({ ...stage })), error: snapshot.error ? { ...snapshot.error } : null };
}
export function isProcessing(snapshot: ProcessingSnapshot | null): boolean {
  return snapshot?.status === 'STARTING' || snapshot?.status === 'PROCESSING';
}
export function sameConfiguration(first: NarrationConfig, second: NarrationConfig): boolean {
  return first.projectId === second.projectId && first.translationId === second.translationId &&
    first.languageCode === second.languageCode && first.voiceId === second.voiceId &&
    first.speed === second.speed && first.translationRevision === second.translationRevision;
}
export function getSimulatedProjectStatus(snapshot: ProcessingSnapshot, mediaType: MediaType): ProjectStatus {
  if (snapshot.status === 'COMPLETED') return 'COMPLETED';
  if (snapshot.status === 'FAILED') return 'FAILED';
  if (snapshot.status === 'PROCESSING') return snapshot.currentStage === 'media' && mediaType === 'VIDEO' ? 'PROCESSING_VIDEO' : 'GENERATING_AUDIO';
  return 'TRANSLATED';
}
