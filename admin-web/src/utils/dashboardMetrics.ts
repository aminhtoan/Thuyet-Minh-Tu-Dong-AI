import type { AdminDashboardData } from '../types/dashboard';

// Counts are server aggregates, never sums of the limited recent-item lists.
export function dashboardKpis(stats: AdminDashboardData['stats']) {
  return [
    { label: 'Khách hàng', value: stats.totalCustomers, icon: 'users' as const, description: 'Tài khoản CUSTOMER chưa xóa', tone: 'primary' as const },
    { label: 'Tổng dự án', value: stats.totalProjects, icon: 'projects' as const, description: 'Toàn bộ bản ghi Project trong hệ thống', tone: 'primary' as const },
    { label: 'Dự án đang xử lý', value: stats.processing, icon: 'jobs' as const, description: 'Đang tạo bản ghi, dịch, giọng đọc hoặc video', tone: 'warning' as const },
    { label: 'Dự án thất bại', value: stats.failed, icon: 'alert' as const, description: 'Project có trạng thái FAILED', tone: 'danger' as const },
  ];
}

export function assertDashboardMetrics(value: unknown): asserts value is Pick<AdminDashboardData, 'stats' | 'jobSummary' | 'generatedAt'> {
  const d = value as AdminDashboardData | null;
  const validCount = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  if (!d || !d.stats || !d.jobSummary || typeof d.generatedAt !== 'string' || !Number.isFinite(Date.parse(d.generatedAt)) ||
    ![d.stats.totalCustomers, d.stats.totalProjects, d.stats.processing, d.stats.failed,
      d.jobSummary.queued, d.jobSummary.processing, d.jobSummary.completedToday, d.jobSummary.failed].every(validCount)) {
    throw new Error('Dữ liệu thống kê quản trị không hợp lệ.');
  }
}
