import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
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
  const { data, loading, error, retry } = useAdminCustomers({ search, status, sort, page, limit: 10 });
  const [selected, setSelected] = useState<AdminCustomer | null>(null); const [pending, setPending] = useState(false); const [feedback, setFeedback] = useState<{ message: string; error?: boolean } | null>(null);
  const reset = () => { setSearch(''); setStatus('ALL'); setSort('NEWEST'); setPage(1); };
  const update = async () => { if (!selected || pending) return; setPending(true); const wasActive = selected.status === 'ACTIVE'; try { await (wasActive ? adminCustomerService.blockCustomer(selected.id) : adminCustomerService.unblockCustomer(selected.id)); setSelected(null); setFeedback({ message: wasActive ? 'Đã khóa tài khoản khách hàng.' : 'Đã mở khóa tài khoản khách hàng.' }); retry(); } catch { setFeedback({ message: wasActive ? 'Không thể khóa tài khoản. Vui lòng thử lại.' : 'Không thể mở khóa tài khoản. Vui lòng thử lại.', error: true }); } finally { setPending(false); } };
  return <><AdminPageHeader title="Khách hàng" description="Quản lý tài khoản khách hàng sử dụng hệ thống." />
    {feedback && <CustomerStatusFeedback {...feedback} onDismiss={() => setFeedback(null)} />}
    {loading ? <CustomerListSkeleton /> : error || !data ? <Card className="customer-state"><EmptyState icon="alert" title="Không thể tải danh sách khách hàng" description="Không thể tải dữ liệu khách hàng. Vui lòng thử lại." /><Button onClick={retry}>Thử lại</Button></Card> : <><CustomerStats summary={data.summary} /><Card className="customer-list-card"><CustomerFilters search={search} status={status} sort={sort} onSearch={value => { setSearch(value); setPage(1); }} onStatus={value => { setStatus(value); setPage(1); }} onSort={value => { setSort(value); setPage(1); }} onReset={reset} />{data.items.length ? <CustomerTable items={data.items} pagination={data.pagination} onPage={setPage} onStatusAction={setSelected} /> : <div className="customer-empty"><EmptyState icon="users" title={search || status !== 'ALL' ? 'Không tìm thấy khách hàng phù hợp.' : 'Chưa có khách hàng nào.'} description={search || status !== 'ALL' ? 'Hãy thay đổi từ khóa hoặc trạng thái tìm kiếm.' : 'Danh sách sẽ xuất hiện khi có dữ liệu khách hàng.'} />{(search || status !== 'ALL') && <Button variant="secondary" onClick={reset}>Đặt lại bộ lọc</Button>}</div>}</Card></>}
    <ConfirmStatusDialog customer={selected} pending={pending} onCancel={() => setSelected(null)} onConfirm={update} />
  </>;
}
