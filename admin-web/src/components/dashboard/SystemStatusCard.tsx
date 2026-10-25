import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import type { AdminDashboardData } from '../../types/dashboard';
export function SystemStatusCard({ summary }: { summary: AdminDashboardData['jobSummary'] }) {
  return <Card className="system-status"><div className="section-heading"><h2>Thống kê công việc</h2></div><p className="muted">ProcessingJob toàn hệ thống, khác số dự án.</p><dl className="workload-summary">
    <div><dt><StatusBadge status="QUEUED" /></dt><dd>{summary.queued}</dd></div>
    <div><dt><StatusBadge status="PROCESSING" /></dt><dd>{summary.processing}</dd></div>
    <div><dt>Công việc hoàn thành hôm nay</dt><dd>{summary.completedToday}</dd></div>
    <div><dt>Công việc thất bại · mọi thời điểm</dt><dd>{summary.failed}</dd></div>
  </dl><p className="workload-note">“Hôm nay” theo múi giờ Backend. Không bao gồm TranslationAttempt; đây không phải kiểm tra sức khỏe dịch vụ.</p></Card>;
}
