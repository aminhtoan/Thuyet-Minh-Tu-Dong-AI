import type { AdminDashboardData } from '../types/dashboard';
// Independent illustrative aggregates, not synced with Customer fixtures.
// Lists are recent subsets; summary counts represent the whole mock workload.
export function createAdminDashboardMock(now = Date.now(), empty = false): AdminDashboardData {
  const at = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
  const jobSummary = empty ? { queued: 0, processing: 0, completedToday: 0, failed: 0 } : { queued: 5, processing: 8, completedToday: 12, failed: 3 };
  return {
    generatedAt: at(0),
    stats: { totalCustomers: empty ? 0 : 128, totalProjects: empty ? 0 : 246, processing: jobSummary.processing, failed: jobSummary.failed },
    jobSummary,
    recentProjects: empty ? [] : [
      { id: 'project-01', name: 'Giới thiệu sản phẩm', userId: 'user-01', customerName: 'Nguyễn Văn An', sourceLanguage: 'vi', targetLanguage: 'en', status: 'COMPLETED', progress: 100, updatedAt: at(2) },
      { id: 'project-02', name: 'Hành trình khám phá', userId: 'user-02', customerName: 'Trần Minh Anh', sourceLanguage: 'vi', targetLanguage: 'ja', status: 'PROCESSING_VIDEO', progress: 68, updatedAt: at(5) },
      { id: 'project-03', name: 'Bài giảng trực tuyến', userId: 'user-03', customerName: 'Lê Thu Hà', sourceLanguage: 'en', targetLanguage: 'vi', status: 'FAILED', updatedAt: at(12) },
      { id: 'project-04', name: 'Bản tin âm thanh', userId: 'user-04', customerName: 'Phạm Hoàng Nam', sourceLanguage: 'vi', targetLanguage: 'ko', status: 'DRAFT', updatedAt: at(35) },
      { id: 'project-05', name: 'Du lịch An Giang', userId: 'user-01', customerName: 'Nguyễn Văn An', sourceLanguage: 'vi', targetLanguage: 'en', status: 'TRANSLATING', progress: 42, updatedAt: at(48) },
    ],
    processingJobs: empty ? [] : [
      { id: 'job-01', projectId: 'project-02', projectName: 'Hành trình khám phá', type: 'VIDEO_PROCESSING', status: 'PROCESSING', progress: 68, startedAt: at(18), updatedAt: at(5) },
      { id: 'job-02', projectId: 'project-05', projectName: 'Du lịch An Giang', type: 'TRANSLATION', status: 'PROCESSING', progress: 42, startedAt: at(55), updatedAt: at(48) },
      { id: 'job-03', projectId: 'project-06', projectName: 'Hướng dẫn sử dụng', type: 'TRANSCRIPTION', status: 'QUEUED', updatedAt: at(7) },
      { id: 'job-04', projectId: 'project-03', projectName: 'Bài giảng trực tuyến', type: 'TTS', status: 'FAILED', progress: 30, startedAt: at(23), updatedAt: at(12) },
      { id: 'job-05', projectId: 'project-01', projectName: 'Giới thiệu sản phẩm', type: 'VIDEO_PROCESSING', status: 'COMPLETED', progress: 100, startedAt: at(32), updatedAt: at(2) },
    ],
    recentActivities: empty ? [] : [
      { id: 'activity-01', userId: 'user-01', action: 'PROJECT_COMPLETED', entityType: 'Project', entityId: 'project-01', description: 'Dự án “Giới thiệu sản phẩm” đã hoàn thành.', createdAt: at(2) },
      { id: 'activity-02', userId: 'user-02', action: 'JOB_STARTED', entityType: 'ProcessingJob', entityId: 'job-01', description: 'Video “Hành trình khám phá” đang được xử lý.', createdAt: at(5) },
      { id: 'activity-03', userId: 'user-05', action: 'JOB_QUEUED', entityType: 'ProcessingJob', entityId: 'job-03', description: '“Hướng dẫn sử dụng” đã được đưa vào hàng chờ tạo bản ghi.', createdAt: at(7) },
      { id: 'activity-04', userId: 'user-03', action: 'JOB_FAILED', entityType: 'ProcessingJob', entityId: 'job-04', description: 'Tạo giọng đọc cho “Bài giảng trực tuyến” thất bại.', createdAt: at(12) },
      { id: 'activity-05', userId: 'user-04', action: 'PROJECT_CREATED', entityType: 'Project', entityId: 'project-04', description: 'Phạm Hoàng Nam tạo dự án “Bản tin âm thanh”.', createdAt: at(35) },
      { id: 'activity-06', userId: 'admin-01', action: 'USER_STATUS_UPDATED', entityType: 'User', entityId: 'user-06', description: 'Quản trị viên cập nhật trạng thái tài khoản khách hàng.', createdAt: at(65) },
    ],
  };
}
