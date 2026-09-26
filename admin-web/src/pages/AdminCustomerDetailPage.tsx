import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import { ConfirmStatusDialog } from '../components/customers/ConfirmStatusDialog';
import { CustomerStatusFeedback } from '../components/customers/CustomerStatusFeedback';
import { useAdminCustomer } from '../hooks/useAdminCustomer';
import { adminCustomerService } from '../services/adminCustomerService';
import { formatDate, formatRelativeTime } from '../utils/dashboardFormat';
import '../styles/customers.css';
export function AdminCustomerDetailPage() {
  const { userId = '' } = useParams(); const { customer, setCustomer, loading, error, retry } = useAdminCustomer(userId); const [dialogOpen, setDialogOpen] = useState(false); const [pending, setPending] = useState(false); const [feedback, setFeedback] = useState<{ message: string; error?: boolean } | null>(null);
  const update = async () => { if (!customer || pending) return; setPending(true); const wasActive = customer.status === 'ACTIVE'; try { const updated = await (wasActive ? adminCustomerService.blockCustomer(customer.id) : adminCustomerService.unblockCustomer(customer.id)); setCustomer(updated); setDialogOpen(false); setFeedback({ message: wasActive ? 'Đã khóa tài khoản khách hàng.' : 'Đã mở khóa tài khoản khách hàng.' }); } catch { setFeedback({ message: wasActive ? 'Không thể khóa tài khoản. Vui lòng thử lại.' : 'Không thể mở khóa tài khoản. Vui lòng thử lại.', error: true }); } finally { setPending(false); } };
  if (loading) return <div className="customer-detail-loading" role="status" aria-label="Đang tải khách hàng"><span className="skeleton-block skeleton-detail" /></div>;
  if (error) return <Card className="customer-state"><EmptyState icon="alert" title="Không thể tải thông tin khách hàng" description="Không thể tải dữ liệu khách hàng. Vui lòng thử lại." /><Button onClick={retry}>Thử lại</Button></Card>;
  if (!customer) return <Card className="customer-state"><EmptyState icon="users" title="Không tìm thấy khách hàng" description="Khách hàng này không tồn tại trong dữ liệu hiện tại." /><Link className="button button--primary" to="/users">Quay lại danh sách khách hàng</Link></Card>;
  return <><Link className="detail-back" to="/users">← Khách hàng</Link><AdminPageHeader title={customer.fullName} description={customer.email} action={<div className="detail-header-action"><StatusBadge status={customer.status} /><Button variant={customer.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => setDialogOpen(true)}>{customer.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</Button></div>} />
    {feedback && <CustomerStatusFeedback {...feedback} onDismiss={() => setFeedback(null)} />}
    <div className="customer-detail-grid"><Card><div className="section-heading"><h2>Thông tin tài khoản</h2></div><dl className="profile-list"><div><dt>Họ và tên</dt><dd>{customer.fullName}</dd></div><div><dt>Email</dt><dd>{customer.email}</dd></div><div><dt>Vai trò</dt><dd>Khách hàng</dd></div><div><dt>Trạng thái</dt><dd><StatusBadge status={customer.status} /></dd></div><div><dt>Ngày tham gia</dt><dd>{formatDate(customer.createdAt)}</dd></div><div><dt>Cập nhật gần nhất</dt><dd>{formatDate(customer.updatedAt)}</dd></div></dl></Card><div><div className="statistics project-summary"><StatCard label="Tổng dự án" value={customer.projectCount} icon="projects" description="Tất cả dự án" /><StatCard label="Hoàn thành" value={customer.completedProjectCount} icon="check" description="Đã hoàn thành" /><StatCard label="Đang xử lý" value={customer.processingProjectCount} icon="jobs" description="Đang thực hiện" /><StatCard label="Thất bại" value={customer.failedProjectCount} icon="alert" description="Cần chú ý" tone="danger" /></div><Card><div className="section-heading"><h2>Dự án gần đây</h2><Link to="/projects">Xem tất cả dự án</Link></div>{customer.recentProjects.length ? <div className="table-scroll"><table><thead><tr><th scope="col">Dự án</th><th scope="col">Ngôn ngữ</th><th scope="col">Trạng thái</th><th scope="col">Cập nhật</th></tr></thead><tbody>{customer.recentProjects.map(project => <tr key={project.id}><td><strong>{project.name}</strong></td><td>{project.languagePair}</td><td><StatusBadge status={project.status} /></td><td>{formatRelativeTime(project.updatedAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon="projects" title="Chưa có dự án" description="Khách hàng chưa tạo dự án nào." />}</Card></div></div>
    <ConfirmStatusDialog customer={dialogOpen ? customer : null} pending={pending} onCancel={() => setDialogOpen(false)} onConfirm={update} />
  </>;
}
