import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import type { AdminDashboardData } from '../../types/dashboard';
export function SystemStatusCard({ summary }: { summary: AdminDashboardData['jobSummary'] }) {
  return <Card className="system-status"><div className="section-heading"><h2>Trạng thái hệ thống</h2></div><p className="muted">Tổng hợp khối lượng công việc</p><dl className="workload-summary">
    <div><dt><StatusBadge status="QUEUED" /></dt><dd>{summary.queued}</dd></div>
    <div><dt><StatusBadge status="PROCESSING" /></dt><dd>{summary.processing}</dd></div>
    <div><dt>Hoàn thành hôm nay</dt><dd>{summary.completedToday}</dd></div>
    <div><dt><StatusBadge status="FAILED" /></dt><dd>{summary.failed}</dd></div>
  </dl><p className="workload-note">Trạng thái hiện tại sử dụng dữ liệu minh họa.</p></Card>;
}
