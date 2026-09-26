import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import type { CustomerSort } from '../../types/customer';
import type { UserStatus } from '../../types/domain';
export function CustomerFilters({ search, status, sort, onSearch, onStatus, onSort, onReset }: { search: string; status: UserStatus | 'ALL'; sort: CustomerSort; onSearch: (value: string) => void; onStatus: (value: UserStatus | 'ALL') => void; onSort: (value: CustomerSort) => void; onReset: () => void }) {
  return <div className="customer-filters">
    <label className="customer-search"><span className="sr-only">Tìm kiếm khách hàng</span><Icon name="search" /><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Tìm theo tên hoặc email..." /></label>
    <label><span>Trạng thái</span><select value={status} onChange={event => onStatus(event.target.value as UserStatus | 'ALL')}><option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="BLOCKED">Đã khóa</option></select></label>
    <label><span>Sắp xếp</span><select value={sort} onChange={event => onSort(event.target.value as CustomerSort)}><option value="NEWEST">Mới nhất</option><option value="OLDEST">Cũ nhất</option><option value="NAME_ASC">Tên A-Z</option><option value="NAME_DESC">Tên Z-A</option></select></label>
    {(search || status !== 'ALL' || sort !== 'NEWEST') && <Button variant="ghost" onClick={onReset}>Đặt lại</Button>}
  </div>;
}
