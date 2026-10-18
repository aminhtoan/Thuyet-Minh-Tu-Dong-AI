export type ProjectStatus = 'DRAFT' | 'UPLOADED' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'TRANSLATING' | 'TRANSLATED' | 'GENERATING_AUDIO' | 'PROCESSING_VIDEO' | 'COMPLETED' | 'FAILED'
export type ProjectStatusFilter = 'ALL' | ProjectStatus
export type ProjectPagination = { page: number; limit: number; total: number; totalPages: number }
export type MediaType = 'VIDEO' | 'AUDIO'
export type LanguageCode = string
export type DataState = 'LOADING' | 'READY' | 'EMPTY' | 'ERROR' | 'UNKNOWN'

export type ProjectMetadataState = {
  media: DataState
  translation: DataState
}

export type WorkflowStep = 'UPLOAD' | 'TRANSCRIPT' | 'TRANSLATION' | 'VOICE' | 'GENERATE' | 'RESULT' | 'UNKNOWN'
export type WorkflowState = 'READY' | 'PROCESSING' | 'FAILED' | 'COMPLETED' | 'BLOCKED'
export type WorkflowTargetLanguageSource = 'JOB' | 'TRANSLATION' | 'NARRATION' | 'RESULT'
export type WorkflowJobType = 'TRANSCRIPTION' | 'TRANSLATION' | 'TTS' | 'VIDEO_PROCESSING'

export type ProjectWorkflow = {
  step: WorkflowStep
  state: WorkflowState
  canResume: boolean
  mediaType: MediaType | null
  targetLanguage: { code: LanguageCode; source: WorkflowTargetLanguageSource } | null
  processing: { jobId: string; type: WorkflowJobType; status: 'QUEUED' | 'PROCESSING'; progress: number } | null
  failure: { jobId: string; type: WorkflowJobType; code: string; failedAt: string } | null
  artifact: { narrationReady: boolean; resultReady: boolean }
}

export type Project = {
  id: string
  name: string
  description?: string
  sourceLanguage: LanguageCode
  targetLanguage?: LanguageCode
  status: ProjectStatus
  progress?: number
  mediaType?: MediaType
  mediaName?: string
  mediaSize?: number
  durationSeconds?: number
  metadataState?: ProjectMetadataState
  workflow?: ProjectWorkflow
  updatedAt: string
  createdAt?: string
}

export type ProjectStatistics = { total: number; completed: number; processing: number; failed: number }
