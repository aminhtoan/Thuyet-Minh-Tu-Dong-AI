import type { LanguageCode } from '../projects/types'

export type TranscriptStatus = 'LOADING' | 'NOT_STARTED' | 'GENERATING' | 'READY' | 'SAVING' | 'SAVED' | 'FAILED'
export type TranscriptSegment = {
  id: string
  backendSegmentId?: string
  sequence: number
  startTime: number
  endTime: number
  text: string
}
export type Transcript = {
  id: string
  projectId: string
  languageCode: LanguageCode
  fullText: string
  revision: number | null
  status: 'READY' | 'SAVED'
  segments: TranscriptSegment[]
  createdAt: string
  updatedAt: string
}

export type TranscriptSegmentUpdate = {
  transcript: { id: string; revision: number; fullText: string }
  segment: { id: string; index: number; startTime: number; endTime: number; text: string }
  downstream: { requiresRevalidation: boolean; artifactsPreserved: boolean; regenerationStarted: boolean }
}
