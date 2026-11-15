import { adminApi } from '../lib/api';
export type OriginalAudioState = { sourceFingerprint: string; version: number | null; publicationId: string | null;
  enabled: boolean; status: 'NOT_PUBLIC' | 'SOURCE_CHANGED' | 'DISABLED' | 'PROCESSING' | 'FAILED' | 'READY' | 'PENDING'; errorCode: string | null };
const path = (projectId: string) => `/published-original-audio/admin/projects/${encodeURIComponent(projectId)}/publication`;
export const originalAudioService = {
  async get(projectId: string, signal?: AbortSignal) {
    return (await adminApi<{ publication: OriginalAudioState }>(path(projectId), { signal })).publication;
  },
  async set(projectId: string, state: OriginalAudioState, enabled: boolean) {
    return (await adminApi<{ publication: OriginalAudioState }>(path(projectId), {
      method: 'PATCH', body: JSON.stringify({ enabled, sourceFingerprint: state.sourceFingerprint, version: state.version }),
    })).publication;
  },
};
export const originalAudioStatus = (state: OriginalAudioState['status']) => ({
  NOT_PUBLIC: 'Chưa công khai', SOURCE_CHANGED: 'Nguồn đã thay đổi', DISABLED: 'Đã tắt công khai',
  PROCESSING: 'Đang chuẩn bị âm thanh', FAILED: 'Xử lý thất bại', READY: 'Sẵn sàng công khai', PENDING: 'Đang chờ chuẩn bị âm thanh',
})[state];
