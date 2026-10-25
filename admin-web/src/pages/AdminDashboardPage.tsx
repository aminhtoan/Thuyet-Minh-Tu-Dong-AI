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
import { dashboardKpis } from '../utils/dashboardMetrics';
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
      <p className="dashboard-source" role="status">Nguồn: API quản trị · {loading ? 'Đang cập nhật; đang hiển thị lần đọc trước.' : 'Số liệu tại thời điểm cập nhật.'}</p>
      <div className="statistics">
        {dashboardKpis(data.stats).map(item => <StatCard key={item.label} {...item} />)}
      </div>
      <div className="dashboard-grid"><RecentProjectsCard projects={data.recentProjects} now={now} /><SystemStatusCard summary={data.jobSummary} /><ProcessingJobsCard jobs={data.processingJobs} now={now} /><RecentActivityCard activities={data.recentActivities} now={now} /></div>
      <details className="dashboard-definitions"><summary>Phạm vi và cách tính số liệu</summary><p>KPI dự án được tổng hợp phía máy chủ, không cộng từ các bảng gần đây. “Đang xử lý” gồm TRANSCRIBING, TRANSLATING, GENERATING_AUDIO và PROCESSING_VIDEO; “Thất bại” chỉ đếm trạng thái FAILED.</p><p>Thống kê công việc đếm ProcessingJob, không đếm dự án hoặc TranslationAttempt. “Hôm nay” bắt đầu lúc 00:00 theo múi giờ Backend, có thể khác thiết bị. Một dự án có thể có nhiều công việc.</p><p>Bảng gần đây giới hạn 5 dự án, 5 công việc và 6 hoạt động theo lần đọc API. Tiến độ 100% không thay thế trạng thái COMPLETED.</p></details>
    </div>}
    <span className="sr-only" aria-live="polite">{loading ? 'Đang tải bảng điều khiển' : error ? '' : 'Đã cập nhật bảng điều khiển'}</span>
  </>;
}
