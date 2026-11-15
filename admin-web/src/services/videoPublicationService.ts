import { adminApi, adminApiBlob } from '../lib/api';

export type GeneratedVideo = {
  id: string; projectId: string; narrationId: string; targetLanguage: string;
  mimeType: string; fileSize: number; duration: number;
};
export type VideoPublicationState = { resultId: string; projectId: string; enabled: boolean; version: number };
const projectPath = (projectId: string) => `/projects/${encodeURIComponent(projectId)}/results`;
const publicationPath = (projectId: string, resultId: string) =>
  `/published-video-narrations/admin/projects/${encodeURIComponent(projectId)}/results/${encodeURIComponent(resultId)}/publication`;
function checkedState(state: VideoPublicationState, projectId: string, resultId: string) {
  if (state.projectId !== projectId || state.resultId !== resultId || typeof state.enabled !== 'boolean'
    || !Number.isSafeInteger(state.version) || state.version < 0) throw Error('Phản hồi trạng thái video không hợp lệ.');
  return state;
}

// Local decode preflight only. Backend performs full decode, digest and provenance checks on activation.
export function inspectVideoBlob(blob: Blob, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(Error('Đã hủy kiểm tra video.')); return; }
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      video.onloadeddata = null; video.onerror = null;
      video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url);
      if (error) reject(error); else resolve();
    };
    const abort = () => finish(Error('Đã hủy kiểm tra video.'));
    const timer = setTimeout(() => finish(Error('Không thể kiểm tra MP4 trong thời gian cho phép.')), 15_000);
    signal?.addEventListener('abort', abort, { once: true });
    video.onloadeddata = () => finish(Number.isFinite(video.duration) && video.duration > 0 && video.videoWidth > 0 && video.videoHeight > 0
      ? undefined : Error('MP4 không có hình ảnh hoặc thời lượng hợp lệ.'));
    video.onerror = () => finish(Error('Trình duyệt không thể đọc video MP4 này.'));
    video.preload = 'auto'; video.muted = true; video.src = url; video.load();
  });
}

export const videoPublicationService = {
  async list(projectId: string, signal?: AbortSignal) {
    const { results } = await adminApi<{ results: GeneratedVideo[] }>(projectPath(projectId), { signal });
    if (results.some(result => result.projectId !== projectId)) throw Error('Kết quả không thuộc dự án này.');
    return results;
  },
  async get(projectId: string, resultId: string, signal?: AbortSignal) {
    const { publication } = await adminApi<{ publication: VideoPublicationState }>(publicationPath(projectId, resultId), { signal });
    return checkedState(publication, projectId, resultId);
  },
  async verify(result: GeneratedVideo, signal?: AbortSignal) {
    const path = `${projectPath(result.projectId)}/${encodeURIComponent(result.id)}`;
    const { result: current } = await adminApi<{ result: GeneratedVideo }>(path, { signal });
    if (current.id !== result.id || current.projectId !== result.projectId || current.narrationId !== result.narrationId
      || current.fileSize !== result.fileSize || current.duration !== result.duration || current.mimeType !== 'video/mp4'
      || !Number.isFinite(current.duration) || current.duration <= 0) throw Error('Kết quả đã thay đổi hoặc không phải MP4 hợp lệ. Tải lại trạng thái.');
    // Construct only the known protected route; never trust fileUrl or fall back to source/public media.
    const blob = await adminApiBlob(`${path}/file`, { signal });
    if (blob.type.split(';')[0] !== 'video/mp4' || blob.size !== current.fileSize || !blob.size
      || await blob.slice(4, 8).text() !== 'ftyp') throw Error('Tệp MP4 bị thiếu hoặc không hợp lệ.');
    await inspectVideoBlob(blob, signal);
  },
  async set(state: VideoPublicationState, enabled: boolean, signal?: AbortSignal) {
    const { publication } = await adminApi<{ publication: VideoPublicationState }>(publicationPath(state.projectId, state.resultId), {
      method: 'PATCH', signal, body: JSON.stringify({ enabled, version: state.version }),
    });
    checkedState(publication, state.projectId, state.resultId);
    const current = await this.get(state.projectId, state.resultId, signal);
    if (current.enabled !== enabled || current.version !== publication.version) throw Error('Trạng thái đã thay đổi. Tải lại trước khi tiếp tục.');
    return current;
  },
};
