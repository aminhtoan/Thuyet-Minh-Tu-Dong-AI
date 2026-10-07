import type { Project } from './types';

// DEVELOPMENT MOCK DATA — replace through the repository when the backend is connected.
export const mockProjects: readonly Project[] = [
  { id: 'project-009', name: 'Du lịch An Giang', sourceLanguage: 'vi', targetLanguage: 'en', status: 'UPLOADED', mediaType: 'VIDEO', mediaName: 'an-giang-travel.mp4', mediaSize: 35_860_480, durationSeconds: 61, updatedAt: '2026-09-25T09:00:00+07:00' },
  { id: 'project-001', name: 'Giới thiệu sản phẩm', sourceLanguage: 'vi', targetLanguage: 'en', status: 'COMPLETED', mediaType: 'VIDEO', progress: 100, updatedAt: '2026-09-25T00:40:00+07:00' },
  { id: 'project-002', name: 'Phim tài liệu du lịch', sourceLanguage: 'vi', targetLanguage: 'ja', status: 'PROCESSING_VIDEO', mediaType: 'VIDEO', progress: 68, updatedAt: '2026-09-24T22:20:00+07:00' },
  { id: 'project-003', name: 'Giới thiệu khóa học', sourceLanguage: 'en', targetLanguage: 'vi', status: 'TRANSLATING', mediaType: 'VIDEO', progress: 42, updatedAt: '2026-09-24T09:15:00+07:00' },
  { id: 'project-004', name: 'Giới thiệu công ty', sourceLanguage: 'vi', targetLanguage: 'ko', status: 'DRAFT', mediaType: 'VIDEO', updatedAt: '2026-09-23T16:00:00+07:00' },
  { id: 'project-005', name: 'Video hướng dẫn', sourceLanguage: 'vi', targetLanguage: 'en', status: 'COMPLETED', mediaType: 'VIDEO', progress: 100, updatedAt: '2026-09-22T11:30:00+07:00' },
  { id: 'project-006', name: 'Chiến dịch tiếp thị', sourceLanguage: 'en', targetLanguage: 'vi', status: 'FAILED', mediaType: 'AUDIO', updatedAt: '2026-09-21T14:45:00+07:00' },
  { id: 'project-007', name: 'Điểm nổi bật podcast', sourceLanguage: 'vi', targetLanguage: 'en', status: 'GENERATING_AUDIO', mediaType: 'AUDIO', progress: 81, updatedAt: '2026-09-20T08:10:00+07:00' },
  { id: 'project-008', name: 'Hướng dẫn điểm đến', sourceLanguage: 'vi', targetLanguage: 'ja', status: 'COMPLETED', mediaType: 'AUDIO', progress: 100, updatedAt: '2026-09-18T10:00:00+07:00' },
];
