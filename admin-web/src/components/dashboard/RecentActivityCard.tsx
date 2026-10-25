import { Card } from '../common/Card';
import { Icon } from '../common/Icon';
import type { DashboardActivity } from '../../types/dashboard';
import { formatDate, formatRelativeTime } from '../../utils/dashboardFormat';
export function RecentActivityCard({ activities, now }: { activities: DashboardActivity[]; now: number }) {
  return <Card className="recent-activity"><div className="section-heading"><h2>Hoạt động gần đây</h2></div>
    <p className="muted">6 bản ghi nhật ký gần nhất, không phải số công việc.</p>
    {!activities.length ? <p className="dashboard-empty">Chưa có hoạt động gần đây.</p> : <ul className="activity">{activities.map(item => <li key={item.id}><span className="activity-icon"><Icon name={item.entityType === 'User' ? 'users' : item.entityType === 'Project' ? 'projects' : 'jobs'} width="16" /></span><div><p>{item.description}</p><time dateTime={item.createdAt} title={formatDate(item.createdAt)}>{formatRelativeTime(item.createdAt, now)}</time></div></li>)}</ul>}
  </Card>;
}
