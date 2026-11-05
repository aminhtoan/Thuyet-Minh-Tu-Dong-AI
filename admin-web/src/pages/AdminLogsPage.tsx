import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { SearchField, FilterSelect } from '../components/common/FormFields';
import { DataTable } from '../components/common/DataTable';
import { Pagination } from '../components/common/Pagination';
import { AdminDialog } from '../components/common/AdminDialog';
import { useAdminLogs } from '../hooks/useAdminLogs';
import { formatDate } from '../utils/dashboardFormat';
import type { ActivityLog, LogCategory, LogRole } from '../types/system';
import '../styles/system.css';
import '../styles/logs.css';

const categoryLabels: Record<LogCategory, string> = { AUTH: 'Xác thực', USER: 'Người dùng', PROJECT: 'Dự án', MEDIA: 'Phương tiện', TRANSCRIPT: 'Bản ghi', TRANSLATION: 'Dịch thuật', VOICE: 'Giọng đọc', PROCESSING: 'Xử lý', ADMIN: 'Quản trị', SYSTEM: 'Hệ thống' };
const roleLabels: Record<ActivityLog['userRole'], string> = { CUSTOMER: 'Khách hàng', ADMIN: 'Quản trị viên', UNKNOWN: 'Không xác định' };
const preview = (value: string, max: number) => value.length > max ? `${value.slice(0, max)}…` : value;

export function AdminLogsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [role, setRole] = useState<LogRole | 'ALL'>('ALL');
  const [days, setDays] = useState<number | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ActivityLog | null>(null);
  const { data, loading, error, retry } = useAdminLogs({ search, category, role, days, page, limit: 10 });
  const filtered = Boolean(search.trim() || category !== 'ALL' || role !== 'ALL' || days !== 'ALL');
  const reset = () => { setSearch(''); setCategory('ALL'); setRole('ALL'); setDays('ALL'); setPage(1); };
  return <div className="logs-page">
    <AdminPageHeader title="Nhật ký hệ thống" description="Theo dõi các hoạt động quan trọng trong hệ thống." />
    <Card className="logs-list-card">
      <div className="system-filters system-filters--four logs-filters">
        <SearchField id="log-search" label="Tìm kiếm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm kiếm nhật ký..." />
        <FilterSelect label="Loại hoạt động" value={category} onChange={e => { setCategory(e.target.value as LogCategory | 'ALL'); setPage(1); }}>
          <option value="ALL">Tất cả</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </FilterSelect>
        <FilterSelect label="Vai trò" value={role} onChange={e => { setRole(e.target.value as LogRole | 'ALL'); setPage(1); }}>
          <option value="ALL">Tất cả</option>{(['CUSTOMER', 'ADMIN'] as const).map(value => <option key={value} value={value}>{roleLabels[value]}</option>)}
        </FilterSelect>
        <FilterSelect label="Thời gian" value={days} onChange={e => { setDays(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)); setPage(1); }}>
          <option value="ALL">Tất cả thời gian</option><option value="1">Hôm nay</option><option value="7">7 ngày qua</option><option value="30">30 ngày qua</option>
        </FilterSelect>
        {filtered && <Button variant="ghost" onClick={reset}>Đặt lại</Button>}
      </div>
      <div className="logs-result-summary" role="status" aria-atomic="true">
        {loading ? 'Đang tải nhật ký…' : error || !data ? 'Chưa tải được kết quả.' : `${data.pagination.total.toLocaleString('vi-VN')} nhật ký${filtered ? ' theo bộ lọc' : ''} · Trang ${data.pagination.totalPages ? data.pagination.page : 0}/${data.pagination.totalPages}`}
      </div>
      <LoadingState loading={loading} label="">
        {loading ? <div className="logs-table-placeholder" aria-hidden="true">Đang tải lịch sử hoạt động…</div> : error || !data ?
          <ErrorState title="Không thể tải nhật ký hệ thống." description="Hãy kiểm tra kết nối và thử lại. Các điều kiện tìm kiếm được giữ nguyên." onRetry={retry} /> :
          data.items.length ? <>
            <DataTable caption="Danh sách nhật ký hệ thống" className="logs-table" minWidth={1100}>
              <thead><tr>{['Thời gian', 'Người thực hiện', 'Hoạt động', 'Đối tượng', 'Mô tả', 'Thao tác'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
              <tbody>{data.items.map(log => <tr key={log.id}>
                <td className="logs-time">{formatDate(log.createdAt)}</td>
                <td className="logs-actor"><strong>{preview(log.userName, 48)}</strong><small>{roleLabels[log.userRole]}</small></td>
                <td>{categoryLabels[log.category]}</td>
                <td className="logs-entity">{preview(log.entityName, 40)}</td>
                <td className="logs-description"><span className="logs-preview">{preview(log.description, 160)}</span></td>
                <td><Button variant="ghost" aria-label={`Xem chi tiết nhật ký ${log.id}`} onClick={() => setSelected(log)}>Xem chi tiết</Button></td>
              </tr>)}</tbody>
            </DataTable>
            <Pagination value={data.pagination} onPage={setPage} label="Phân trang nhật ký" displayedCount={data.items.length} />
          </> : <EmptyState icon="logs" title={filtered ? 'Không tìm thấy nhật ký phù hợp.' : 'Chưa có nhật ký hệ thống.'}
            description={filtered ? 'Hãy thay đổi từ khóa hoặc điều kiện lọc.' : 'Lịch sử hoạt động sẽ xuất hiện khi hệ thống có dữ liệu.'}
            action={filtered ? <Button variant="secondary" onClick={reset}>Đặt lại bộ lọc</Button> : undefined} />}
      </LoadingState>
    </Card>
    {selected && <AdminDialog open onClose={() => setSelected(null)} labelledBy="log-title" className="logs-detail-dialog">
      <h2 id="log-title">Chi tiết nhật ký</h2>
      <div className="logs-detail-content" role="region" aria-label="Nội dung nhật ký đầy đủ" tabIndex={0}>
        <dl>
          <div><dt>Mã nhật ký</dt><dd>{selected.id}</dd></div>
          <div><dt>Thời gian</dt><dd>{formatDate(selected.createdAt)}</dd></div>
          <div><dt>Người thực hiện</dt><dd>{selected.userName}</dd></div>
          <div><dt>Vai trò</dt><dd>{roleLabels[selected.userRole]}</dd></div>
          <div><dt>Hoạt động</dt><dd>{categoryLabels[selected.category]}</dd></div>
          <div><dt>Hành động</dt><dd>{selected.action}</dd></div>
          <div><dt>Loại đối tượng</dt><dd>{selected.entityType}</dd></div>
          <div><dt>Mã đối tượng</dt><dd>{selected.entityId}</dd></div>
          <div><dt>Đối tượng</dt><dd>{selected.entityName}</dd></div>
          <div><dt>Mô tả</dt><dd>{selected.description}</dd></div>
        </dl>
      </div>
      <div className="confirm-dialog__actions"><Button autoFocus onClick={() => setSelected(null)}>Đóng</Button></div>
    </AdminDialog>}
  </div>;
}
