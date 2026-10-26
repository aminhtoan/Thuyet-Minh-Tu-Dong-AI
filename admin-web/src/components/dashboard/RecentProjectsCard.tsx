import { Link } from 'react-router-dom';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { DashboardProgress } from './DashboardProgress';
import type { DashboardProject } from '../../types/dashboard';
import { formatDate, formatRelativeTime, hasProjectProgress } from '../../utils/dashboardFormat';
export function RecentProjectsCard({ projects, now }: { projects: DashboardProject[]; now: number }) {
  return <Card className="recent-projects"><div className="section-heading"><h2>Dự án gần đây</h2><Link to="/projects">Xem tất cả</Link></div>
    <p className="muted">Tối đa 5 dự án được cập nhật gần nhất.</p>
    {!projects.length ? <p className="dashboard-empty">Chưa có dự án nào.</p> : <div className="table-scroll" tabIndex={0} aria-label="Dự án gần đây"><table><caption className="sr-only">Năm dự án được cập nhật gần đây nhất</caption><thead><tr>{['Dự án', 'Người tạo', 'Ngôn ngữ', 'Trạng thái', 'Tiến độ', 'Cập nhật'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{projects.map(project => <tr key={project.id}><td><strong>{project.name}</strong></td><td>{project.customerName}</td><td className="language-pair">{project.sourceLanguage.toUpperCase()} → {project.targetLanguages.map(value=>value.toUpperCase()).join(', ')||'—'}</td><td><StatusBadge status={project.status} /></td><td>{hasProjectProgress(project.status) ? <DashboardProgress value={project.progress} label={'Tiến độ dự án ' + project.name} /> : <span aria-label="Không áp dụng">—</span>}</td><td><time dateTime={project.updatedAt} title={formatDate(project.updatedAt)}>{formatRelativeTime(project.updatedAt, now)}</time></td></tr>)}</tbody></table></div>}
  </Card>;
}
