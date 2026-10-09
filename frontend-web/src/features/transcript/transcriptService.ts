import { ApiError, api } from '../../lib/api'
import { projectRepository } from '../projects/projectRepository'
import type { Transcript } from './types'
type Options = { signal?: AbortSignal }
type TranscriptDto = { id: string; projectId: string; language: string; fullText: string; segments: Array<{ index: number; startTime: number; endTime: number; text: string }>; createdAt: string; updatedAt: string }
const mapTranscript = (value: TranscriptDto): Transcript => ({ id: value.id, projectId: value.projectId, languageCode: value.language, fullText: value.fullText, status: 'SAVED', createdAt: value.createdAt, updatedAt: value.updatedAt, segments: value.segments.map((segment) => ({ id: `${value.id}-${segment.index}`, sequence: segment.index + 1, startTime: segment.startTime, endTime: segment.endTime, text: segment.text })) })

export const transcriptService = {
  async getTranscript(projectId: string, options: Options = {}): Promise<Transcript | null> {
    try { const value = await api<{ transcript: TranscriptDto }>(`/projects/${projectId}/transcript`, { signal: options.signal }); return mapTranscript(value.transcript) }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error }
  },
  async generateTranscript(projectId: string, options: Options = {}): Promise<Transcript> {
    if (!window.confirm('Bắt đầu chuyển giọng nói thành văn bản? Thao tác này có thể sử dụng dịch vụ AI tính phí.')) throw new DOMException('Đã hủy', 'AbortError')
    const value = await api<{ transcript: TranscriptDto }>(`/projects/${projectId}/transcription`, { method: 'POST', signal: options.signal })
    await projectRepository.refresh(); return mapTranscript(value.transcript)
  },
  async saveTranscript(_projectId: string, _draft: Transcript, _options: Options = {}): Promise<Transcript> { throw new Error('Backend chưa hỗ trợ lưu chỉnh sửa bản ghi.') },
}
