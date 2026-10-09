export type ProjectStatus = 'DRAFT' | 'UPLOADED' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'TRANSLATING' | 'TRANSLATED' | 'GENERATING_AUDIO' | 'PROCESSING_VIDEO' | 'COMPLETED' | 'FAILED'
export type ProjectStatusFilter = 'ALL' | ProjectStatus
export type ProjectPagination = { page: number; limit: number; total: number; totalPages: number }
export type MediaType = 'VIDEO' | 'AUDIO'
export type LanguageCode = string

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
  updatedAt: string
  createdAt?: string
}

export type ProjectStatistics = { total: number; completed: number; processing: number; failed: number }
