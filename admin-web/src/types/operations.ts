import type { ProcessingJobStatus, ProcessingJobType, ProjectStatus } from './domain';
export type LanguageCode = 'vi' | 'en' | 'ja' | 'ko';
export type MediaType = 'VIDEO' | 'AUDIO';
export interface AdminMedia { fileName: string; mediaType: MediaType; mimeType: string; sizeMb: number; duration: string }
export interface AdminProject { id: string; userId: string; customerName: string; customerEmail: string; name: string; description: string; sourceLanguage: LanguageCode; targetLanguage: LanguageCode; mediaType: MediaType; status: ProjectStatus; progress: number; createdAt: string; updatedAt: string; media: AdminMedia }
export interface AdminJob { id: string; projectId: string; projectName: string; userId: string; customerName: string; type: ProcessingJobType; status: ProcessingJobStatus; progress: number; errorMessage?: string; errorCode?: string; createdAt: string; startedAt?: string; completedAt?: string }
export interface Pagination { page: number; limit: number; total: number; totalPages: number }
export interface ProjectSummary { total: number; processing: number; completed: number; failed: number }
export interface JobSummary { queued: number; processing: number; completed: number; failed: number; cancelled: number }
export interface ProjectQuery { page?: number; limit?: number; search?: string; status?: ProjectStatus | 'ALL'; language?: LanguageCode | 'ALL'; mediaType?: MediaType | 'ALL'; signal?: AbortSignal; latencyMs?: number }
export interface JobQuery { page?: number; limit?: number; search?: string; type?: ProcessingJobType | 'ALL'; status?: ProcessingJobStatus | 'ALL'; signal?: AbortSignal; latencyMs?: number }
export interface ProjectListResult { items: AdminProject[]; summary: ProjectSummary; pagination: Pagination }
export interface JobListResult { items: AdminJob[]; summary: JobSummary; pagination: Pagination }
