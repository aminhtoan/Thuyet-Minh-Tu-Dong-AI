import type { Project } from './types'

// DEVELOPMENT MOCK DATA — replace through the repository when the backend is connected.
export const mockProjects: readonly Project[] = [
  { id: 'project-009', name: 'An Giang Travel', sourceLanguage: 'vi', targetLanguage: 'en', status: 'UPLOADED', mediaType: 'VIDEO', mediaName: 'an-giang-travel.mp4', mediaSize: 35_860_480, durationSeconds: 61, updatedAt: '2026-09-25T09:00:00+07:00' },
  { id: 'project-001', name: 'Product Introduction', sourceLanguage: 'vi', targetLanguage: 'en', status: 'COMPLETED', mediaType: 'VIDEO', progress: 100, updatedAt: '2026-09-25T00:40:00+07:00' },
  { id: 'project-002', name: 'Travel Documentary', sourceLanguage: 'vi', targetLanguage: 'ja', status: 'PROCESSING_VIDEO', mediaType: 'VIDEO', progress: 68, updatedAt: '2026-09-24T22:20:00+07:00' },
  { id: 'project-003', name: 'Course Introduction', sourceLanguage: 'en', targetLanguage: 'vi', status: 'TRANSLATING', mediaType: 'VIDEO', progress: 42, updatedAt: '2026-09-24T09:15:00+07:00' },
  { id: 'project-004', name: 'Company Presentation', sourceLanguage: 'vi', targetLanguage: 'ko', status: 'DRAFT', mediaType: 'VIDEO', updatedAt: '2026-09-23T16:00:00+07:00' },
  { id: 'project-005', name: 'Tutorial Video', sourceLanguage: 'vi', targetLanguage: 'en', status: 'COMPLETED', mediaType: 'VIDEO', progress: 100, updatedAt: '2026-09-22T11:30:00+07:00' },
  { id: 'project-006', name: 'Marketing Campaign', sourceLanguage: 'en', targetLanguage: 'vi', status: 'FAILED', mediaType: 'AUDIO', updatedAt: '2026-09-21T14:45:00+07:00' },
  { id: 'project-007', name: 'Podcast Highlights', sourceLanguage: 'vi', targetLanguage: 'en', status: 'GENERATING_AUDIO', mediaType: 'AUDIO', progress: 81, updatedAt: '2026-09-20T08:10:00+07:00' },
  { id: 'project-008', name: 'Destination Guide', sourceLanguage: 'vi', targetLanguage: 'ja', status: 'COMPLETED', mediaType: 'AUDIO', progress: 100, updatedAt: '2026-09-18T10:00:00+07:00' },
]
