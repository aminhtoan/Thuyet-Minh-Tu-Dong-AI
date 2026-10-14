import { ApiError, api } from '../../lib/api'
import { projectRepository } from '../projects/projectRepository'
import type { Transcript } from './types'
import { confirmationMessages } from '../../localization/confirmationMessages.mjs'
import { requireConfirmation } from '../../utils/confirmationGuard.mjs'
type Options = { signal?: AbortSignal }
type TranscriptDto = { id: string; projectId: string; language: string; fullText: string; segments: Array<{ id?: string; index: number; startTime: number; endTime: number; text: string }>; createdAt: string; updatedAt: string }
const mapTranscript = (value: TranscriptDto): Transcript => ({ id: value.id, projectId: value.projectId, languageCode: value.language, fullText: value.fullText, status: 'SAVED', createdAt: value.createdAt, updatedAt: value.updatedAt, segments: value.segments.map((segment) => ({ id: `${value.id}-${segment.index}`, backendSegmentId: segment.id, sequence: segment.index + 1, startTime: segment.startTime, endTime: segment.endTime, text: segment.text })) })

export const transcriptService = {
  async getTranscript(projectId: string, options: Options = {}): Promise<Transcript | null> {
    try { const value = await api<{ transcript: TranscriptDto }>(`/projects/${projectId}/transcript`, { signal: options.signal }); return mapTranscript(value.transcript) }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error }
  },
  async generateTranscript(projectId: string, options: Options = {}): Promise<Transcript> {
    requireConfirmation(window.confirm, confirmationMessages.transcript)
    const value = await api<{ transcript: TranscriptDto }>(`/projects/${projectId}/transcription`, { method: 'POST', signal: options.signal })
    await projectRepository.refresh(); return mapTranscript(value.transcript)
  },
  async saveTranscript(_projectId: string, _draft: Transcript, _options: Options = {}): Promise<Transcript> { throw new Error('Máy chủ chưa hỗ trợ lưu chỉnh sửa bản ghi.') },
}
