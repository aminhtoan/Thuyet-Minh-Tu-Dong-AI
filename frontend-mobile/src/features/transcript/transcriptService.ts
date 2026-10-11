import { ApiError, api } from '../../lib/api';
import { confirmAction } from '../../lib/confirm';
import { confirmationMessages } from '../../localization/confirmationMessages.mjs';
import { projectRepository } from '../projects/projectRepository';
import type { Transcript } from './types';
import { confirmTranscriptRequest, mapTranscriptDto } from './transcriptWorkflow.mjs';
type Options = { signal?: AbortSignal };
type TranscriptDto = { id: string; projectId: string; language: string; fullText: string; status: 'READY'; createdAt: string; updatedAt: string; segments?: { id?: string; index?: number; startTime?: number; endTime?: number; text?: string }[] };
class TranscriptTimeoutError extends Error { constructor() { super('TRANSCRIPT_REQUEST_TIMEOUT'); this.name = 'TranscriptTimeoutError'; } }
const REQUEST_TIMEOUT_MS = 300_000;

function timedSignal(parent?: AbortSignal) {
  const controller = new AbortController();
  let didTimeout = false;
  const abort = () => controller.abort(parent?.reason);
  parent?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { didTimeout = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, cleanup: () => { clearTimeout(timer); parent?.removeEventListener('abort', abort); }, timedOut: () => didTimeout };
}
export const transcriptService = {
  async getTranscript(projectId: string, options: Options = {}) { try { const response = await api<{ transcript: TranscriptDto }>(`/projects/${projectId}/transcript`, { signal: options.signal }); return mapTranscriptDto(response.transcript); } catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; } },
  async generateTranscript(projectId: string, options: Options = {}) { return confirmTranscriptRequest(() => confirmAction('Tạo bản ghi', confirmationMessages.transcript), async () => { const timed = timedSignal(options.signal); try { const response = await api<{ transcript: TranscriptDto }>(`/projects/${projectId}/transcription`, { method: 'POST', signal: timed.signal }); return mapTranscriptDto(response.transcript); } catch (error) { if (timed.timedOut()) throw new TranscriptTimeoutError(); throw error; } finally { timed.cleanup(); await projectRepository.refresh(); } }); },
  async saveTranscript(_projectId?: string, _draft?: Transcript, _options?: Options) { throw new Error('Máy chủ chưa hỗ trợ chỉnh sửa bản ghi.'); },
};
