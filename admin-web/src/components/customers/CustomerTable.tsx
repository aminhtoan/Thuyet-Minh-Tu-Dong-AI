import { Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { Pagination } from '../common/Pagination';
import { DataTable } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate, formatRelativeTime } from '../../utils/dashboardFormat';
import type { AdminCustomer, CustomerPagination } from '../../types/customer';
export function CustomerTable({ items, pagination, onPage, onStatusAction }: { items: AdminCustomer[]; pagination: CustomerPagination; onPage: (page: number) => void; onStatusAction: (customer: AdminCustomer) => void }) {
  return <><DataTable caption="Danh sách người dùng" className="customer-table" minWidth={940}><thead><tr><th scope="col">Người dùng</th><th scope="col">Email</th><th scope="col">Trạng thái</th><th scope="col">Dự án</th><th scope="col">Ngày tham gia</th><th scope="col">Cập nhật</th><th scope="col">Thao tác</th></tr></thead><tbody>{items.map(customer => <tr key={customer.id}><td><div className="customer-cell"><span className="customer-avatar" aria-hidden="true">{customer.fullName.split(' ').slice(-2).map(word => word[0]).join('')}</span><strong>{customer.fullName}</strong></div></td><td>{customer.email}</td><td><StatusBadge status={customer.status} /></td><td>{customer.projectCount}</td><td>{formatDate(customer.createdAt)}</td><td>{formatRelativeTime(customer.updatedAt)}</td><td><div className="row-actions"><Link className="button button--ghost" aria-label={`Xem chi tiết ${customer.fullName}`} to={`/users/${customer.id}`}>Xem chi tiết</Link><Button variant="ghost" aria-label={`${customer.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'} ${customer.fullName}`} onClick={() => onStatusAction(customer)}>{customer.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}</Button></div></td></tr>)}</tbody></DataTable>
    <Pagination value={pagination} onPage={onPage} displayedCount={items.length} label="Phân trang người dùng" /></>;
}
