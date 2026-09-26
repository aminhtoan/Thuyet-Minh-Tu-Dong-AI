import type { ProcessingJobType, ProjectStatus } from '../types/domain';
export const jobTypeLabels: Record<ProcessingJobType, string> = {
  TRANSCRIPTION: 'Chuyển giọng nói thành văn bản', TRANSLATION: 'Dịch thuật',
  TTS: 'Tạo giọng đọc', VIDEO_PROCESSING: 'Xử lý video',
};
export function hasProjectProgress(status: ProjectStatus) {
  return ['TRANSCRIBING', 'TRANSLATING', 'GENERATING_AUDIO', 'PROCESSING_VIDEO', 'COMPLETED'].includes(status);
}
export function clampProgress(value: number) { return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0; }
export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) : 'Chưa cập nhật';
}
export function formatRelativeTime(value: string, now = Date.now()): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Chưa cập nhật';
  const elapsed = now - timestamp;
  if (elapsed < 0) return formatDate(value);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return minutes + ' phút trước';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' giờ trước';
  if (hours < 48) return 'Hôm qua';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}
