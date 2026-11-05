import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { CustomerStats } from '../components/customers/CustomerStats';
import { CustomerFilters } from '../components/customers/CustomerFilters';
import { CustomerTable } from '../components/customers/CustomerTable';
import { CustomerListSkeleton } from '../components/customers/CustomerListSkeleton';
import { ConfirmStatusDialog } from '../components/customers/ConfirmStatusDialog';
import { CustomerStatusFeedback } from '../components/customers/CustomerStatusFeedback';
import { useAdminCustomers } from '../hooks/useAdminCustomers';
import { adminCustomerService } from '../services/adminCustomerService';
import type { AdminCustomer, CustomerSort } from '../types/customer';
import type { UserStatus } from '../types/domain';
import '../styles/customers.css';

export function AdminUsersPage() {
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<UserStatus | 'ALL'>('ALL'); const [sort, setSort] = useState<CustomerSort>('NEWEST'); const [page, setPage] = useState(1);
  const { data, summary, loading, error, retry } = useAdminCustomers({ search, status, sort, page, limit: 10 });
  const [selected, setSelected] = useState<AdminCustomer | null>(null); const [pending, setPending] = useState(false); const [feedback, setFeedback] = useState<{ message: string; error?: boolean } | null>(null);
  const reset = () => { setSearch(''); setStatus('ALL'); setSort('NEWEST'); setPage(1); };
  const update = async () => { if (!selected || pending) return; setPending(true); const wasActive = selected.status === 'ACTIVE'; try { await (wasActive ? adminCustomerService.blockCustomer(selected.id) : adminCustomerService.unblockCustomer(selected.id)); setSelected(null); setFeedback({ message: wasActive ? 'Đã khóa tài khoản cán bộ.' : 'Đã mở khóa tài khoản cán bộ.' }); retry(); } catch { setFeedback({ message: wasActive ? 'Không thể khóa tài khoản. Vui lòng thử lại.' : 'Không thể mở khóa tài khoản. Vui lòng thử lại.', error: true }); } finally { setPending(false); } };
  return <div className="users-page"><AdminPageHeader title="Quản lý người dùng" description="Theo dõi tài khoản người dùng và quản lý trạng thái truy cập hệ thống." />
    {feedback && <CustomerStatusFeedback {...feedback} onDismiss={() => setFeedback(null)} />}
    {summary && <div><CustomerStats summary={summary} /><p className="users-stats-note">{loading || error ? 'Thống kê từ lần tải thành công gần nhất.' : 'Thống kê do hệ thống cung cấp tại lần tải gần nhất.'}</p></div>}
    <Card className="customer-list-card">
      <CustomerFilters search={search} status={status} sort={sort}
        onSearch={value => { setSearch(value); setPage(1); }}
        onStatus={value => { setStatus(value); setPage(1); }}
        onSort={value => { setSort(value); setPage(1); }} onReset={reset} />
      <div className="users-result-summary" role="status" aria-atomic="true">
        {loading ? 'Đang tải danh sách người dùng…' : error || !data ? 'Chưa tải được kết quả.' :
          `${data.pagination.total.toLocaleString('vi-VN')} kết quả${search.trim() || status !== 'ALL' ? ' theo bộ lọc' : ''} · Trang ${data.pagination.totalPages ? data.pagination.page : 0}/${data.pagination.totalPages}`}
      </div>
      <LoadingState loading={loading} label="">
        {loading ? <CustomerListSkeleton rowsOnly /> : error || !data ?
          <ErrorState title="Không thể tải danh sách người dùng" description="Hãy kiểm tra kết nối và thử lại. Các điều kiện tìm kiếm được giữ nguyên." onRetry={retry} /> :
          data.items.length ? <CustomerTable items={data.items} pagination={data.pagination} onPage={setPage} onStatusAction={setSelected} /> :
          <div className="customer-empty"><EmptyState icon="users"
            title={search.trim() || status !== 'ALL' ? 'Không tìm thấy người dùng phù hợp.' : 'Chưa có người dùng nào.'}
            description={search.trim() || status !== 'ALL' ? 'Hãy thay đổi từ khóa hoặc trạng thái tìm kiếm.' : 'Danh sách sẽ xuất hiện khi hệ thống có tài khoản người dùng.'}
            action={search.trim() || status !== 'ALL' ? <Button variant="secondary" onClick={reset}>Đặt lại bộ lọc</Button> : undefined} /></div>}
      </LoadingState>
    </Card>
    <ConfirmStatusDialog customer={selected} pending={pending} onCancel={() => setSelected(null)} onConfirm={update} />
  </div>;
}
