import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
export function DashboardErrorState({ onRetry, loading }: { onRetry: () => void; loading: boolean }) {
  return <Card className="dashboard-error"><div role="alert"><Icon name="alert" width="30" height="30" /><h2>Không thể tải bảng điều khiển</h2><p>Không thể tải dữ liệu quản trị. Vui lòng thử lại.</p></div><Button onClick={onRetry} disabled={loading}>Thử lại</Button></Card>;
}
