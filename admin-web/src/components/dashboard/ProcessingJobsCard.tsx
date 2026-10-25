import { Link } from 'react-router-dom';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { DashboardProgress } from './DashboardProgress';
import type { DashboardJob } from '../../types/dashboard';
import { formatDate, formatRelativeTime, jobTypeLabels } from '../../utils/dashboardFormat';
export function ProcessingJobsCard({ jobs, now }: { jobs: DashboardJob[]; now: number }) {
  return <Card className="processing-jobs"><div className="section-heading"><h2>Công việc gần đây</h2><Link to="/jobs">Xem tất cả công việc</Link></div><p className="muted">Tối đa 5 công việc được cập nhật gần nhất, gồm mọi trạng thái.</p>
    {!jobs.length ? <p className="dashboard-empty">Chưa có công việc trong danh sách gần đây.</p> : <div className="table-scroll" tabIndex={0} aria-label="Công việc xử lý"><table><thead><tr>{['Dự án / Công việc', 'Trạng thái', 'Tiến độ', 'Cập nhật'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{jobs.map(job => <tr key={job.id}><td><strong>{job.projectName}</strong><small>{jobTypeLabels[job.type]}</small></td><td><StatusBadge status={job.status} /></td><td>{job.status === 'QUEUED' || job.status === 'CANCELLED' ? <span>—</span> : <DashboardProgress value={job.progress} label={'Tiến độ công việc ' + job.id + ' - ' + job.projectName} />}</td><td><time dateTime={job.updatedAt} title={formatDate(job.updatedAt)}>{formatRelativeTime(job.updatedAt, now)}</time>{job.startedAt && <small>Bắt đầu {formatRelativeTime(job.startedAt, now)}</small>}</td></tr>)}</tbody></table></div>}
  </Card>;
}
