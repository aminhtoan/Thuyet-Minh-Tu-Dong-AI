import { ApiError, api } from '../../lib/api';
import { confirmAction } from '../../lib/confirm';
import { projectRepository } from '../projects/projectRepository';
import type { Transcript } from './types';
type Options = { signal?: AbortSignal };
type TranscriptDto = { id: string; projectId: string; language: string; fullText: string; status: 'READY'; createdAt: string; updatedAt: string; segments: { id: string; index: number; startTime: number; endTime: number; text: string }[] };
const map = (value: TranscriptDto): Transcript => ({ id: value.id, projectId: value.projectId, languageCode: value.language, fullText: value.fullText, status: 'SAVED', createdAt: value.createdAt, updatedAt: value.updatedAt, segments: value.segments.map((segment) => ({ id: segment.id, sequence: segment.index, startTime: segment.startTime, endTime: segment.endTime, text: segment.text })) });
export const transcriptService = {
  async getTranscript(projectId: string, options: Options = {}) { try { const response = await api<{ transcript: TranscriptDto }>(`/projects/${projectId}/transcript`, { signal: options.signal }); return map(response.transcript); } catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; } },
  async generateTranscript(projectId: string, options: Options = {}) { if (!await confirmAction('Tạo bản ghi', 'Bắt đầu chuyển giọng nói thành văn bản? Thao tác này có thể sử dụng dịch vụ AI tính phí.')) throw new Error('Đã hủy thao tác.'); const response = await api<{ transcript: TranscriptDto }>(`/projects/${projectId}/transcription`, { method: 'POST', signal: options.signal }); await projectRepository.refresh(); return map(response.transcript); },
  async saveTranscript(_projectId?: string, _draft?: Transcript, _options?: Options) { throw new Error('Backend chưa hỗ trợ chỉnh sửa bản ghi.'); },
};
