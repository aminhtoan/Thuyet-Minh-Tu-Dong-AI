import { Link } from 'react-router-dom';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import type { IconName } from '../components/common/Icon';
export function ManagementPlaceholder({ title, description, feature, sprint, icon }: { title: string; description: string; feature: string; sprint: string; icon: IconName }) {
  return <><AdminPageHeader title={title} description={description} action={<Badge>{sprint} · Dự kiến</Badge>} /><Card className="coming-soon"><EmptyState title={feature} description={feature + ' sẽ được triển khai trong ' + sprint + '.'} icon={icon} /><p>Đây là trang định tuyến nền tảng S12. Chưa có dữ liệu hoặc thao tác quản lý thật.</p><Link className="button button--secondary" to="/dashboard">Về bảng điều khiển</Link></Card></>;
}
