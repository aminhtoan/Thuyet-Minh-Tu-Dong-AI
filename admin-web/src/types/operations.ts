import type { ProcessingJobStatus, ProcessingJobType, ProjectStatus } from './domain';
export type LanguageCode = string;
export type MediaType = 'VIDEO' | 'AUDIO';
export interface AdminMedia { fileName: string; mediaType: MediaType; mimeType: string; sizeMb: number; duration: string }
export interface NarrationApprovalInfo {
  total: number;
  approved: number;
  status: 'NO_AUDIO' | 'ALL_APPROVED' | 'PARTIAL' | 'NONE_APPROVED';
}
export interface AdminNarration {
  id: string;
  projectId: string;
  languageCode: string;
  languageName: string;
  voiceName: string;
  voiceGender: string;
  duration: number;
  fileSize: number;
  speed: number;
  status: string;
  isApproved: boolean;
  approvedAt: string | null;
  audioUrl: string;
  createdAt: string;
}
export interface AdminProject {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  name: string;
  description: string;
  sourceLanguage: LanguageCode;
  targetLanguages: LanguageCode[];
  mediaType?: MediaType;
  status: ProjectStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  media: AdminMedia | null;
  narrationApproval?: NarrationApprovalInfo;
}
export interface AdminJob { id: string; projectId: string; projectName: string; userId: string; customerName: string; type: ProcessingJobType; targetLanguage?:string; status: ProcessingJobStatus; progress: number; errorMessage?: string; createdAt: string; updatedAt:string; startedAt?: string; completedAt?: string }
export interface Pagination { page: number; limit: number; total: number; totalPages: number }
export interface ProjectSummary { total: number; processing: number; completed: number; failed: number }
export interface JobSummary { queued: number; processing: number; completed: number; failed: number; cancelled: number }
export interface ProjectQuery { page?: number; limit?: number; search?: string; status?: ProjectStatus | 'ALL'; language?: LanguageCode | 'ALL'; mediaType?: MediaType | 'ALL'; signal?: AbortSignal; latencyMs?: number }
export interface JobQuery { page?: number; limit?: number; search?: string; type?: ProcessingJobType | 'ALL'; status?: ProcessingJobStatus | 'ALL'; signal?: AbortSignal; latencyMs?: number }
export interface ProjectListResult { items: AdminProject[]; summary: ProjectSummary; pagination: Pagination }
export interface JobListResult { items: AdminJob[]; summary: JobSummary; pagination: Pagination }
