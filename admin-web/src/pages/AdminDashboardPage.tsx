import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';
import { DashboardErrorState } from '../components/dashboard/DashboardErrorState';
import { RecentProjectsCard } from '../components/dashboard/RecentProjectsCard';
import { ProcessingJobsCard } from '../components/dashboard/ProcessingJobsCard';
import { SystemStatusCard } from '../components/dashboard/SystemStatusCard';
import { RecentActivityCard } from '../components/dashboard/RecentActivityCard';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { formatDate } from '../utils/dashboardFormat';
import '../styles/dashboard.css';

export function AdminDashboardPage() {
  const { data, loading, error, refresh } = useAdminDashboard();
  const now = data ? Date.parse(data.generatedAt) : 0;
  return <>
    <AdminPageHeader title="Bảng điều khiển quản trị" description="Theo dõi hoạt động của hệ thống thuyết minh đa ngôn ngữ."
      action={<div className="dashboard-controls">{data && <span className="dashboard-updated">Cập nhật: {formatDate(data.generatedAt)}</span>}<Button variant="secondary" onClick={refresh} disabled={loading}>{loading ? 'Đang tải…' : 'Làm mới'}</Button></div>} />
    {loading && !data && <DashboardSkeleton />}
    {error && <DashboardErrorState onRetry={refresh} loading={loading} />}
    {data && <div className="dashboard-content" aria-busy={loading}>
      <div className="statistics">
        <StatCard label="Tổng khách hàng" value={data.stats.totalCustomers} icon="users" description="Tài khoản khách hàng" />
        <StatCard label="Tổng dự án" value={data.stats.totalProjects} icon="projects" description="Tất cả dự án trong hệ thống" />
        <StatCard label="Đang xử lý" value={data.stats.processing} icon="jobs" tone="warning" description="Công việc đang chạy" />
        <StatCard label="Thất bại" value={data.stats.failed} icon="alert" tone="danger" description="Công việc cần kiểm tra" />
      </div>
      <div className="dashboard-grid"><RecentProjectsCard projects={data.recentProjects} now={now} /><SystemStatusCard summary={data.jobSummary} /><ProcessingJobsCard jobs={data.processingJobs} now={now} /><RecentActivityCard activities={data.recentActivities} now={now} /></div>
    </div>}
    <span className="sr-only" aria-live="polite">{loading ? 'Đang tải bảng điều khiển' : error ? '' : 'Đã cập nhật bảng điều khiển'}</span>
  </>;
}
