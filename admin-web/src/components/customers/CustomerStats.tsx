import { StatCard } from '../common/StatCard';
import type { CustomerSummary } from '../../types/customer';
export function CustomerStats({ summary }: { summary: CustomerSummary }) {
  return <div className="statistics customer-statistics" aria-label="Thống kê khách hàng">
    <StatCard label="Tổng khách hàng" value={summary.total} icon="users" description="Tài khoản khách hàng" />
    <StatCard label="Đang hoạt động" value={summary.active} icon="check" description="Trạng thái hoạt động" />
    <StatCard label="Đã khóa" value={summary.blocked} icon="lock" description="Trạng thái đã khóa" tone="danger" />
    <StatCard label="Khách hàng mới" value={summary.newCustomers} icon="userPlus" description="Tham gia trong 30 ngày" />
  </div>;
}
