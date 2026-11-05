import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { DataTable } from '../components/common/DataTable';
import { Pagination } from '../components/common/Pagination';
import { SearchField, FilterSelect } from '../components/common/FormFields';
import { StatusBadge } from '../components/common/StatusBadge';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { OperationProgress } from '../components/operations/OperationsCommon';
import { NarrationApprovalModal } from '../components/operations/NarrationApprovalModal';
import { useProjects } from '../hooks/useOperations';
import type { AdminProject, MediaType } from '../types/operations';
import type { ProjectStatus } from '../types/domain';
import '../styles/operations.css';
import '../styles/projects.css';

const projectStatuses: ProjectStatus[] = ['DRAFT', 'UPLOADED', 'TRANSCRIBING', 'TRANSCRIBED', 'TRANSLATING', 'TRANSLATED', 'GENERATING_AUDIO', 'PROCESSING_VIDEO', 'COMPLETED', 'FAILED'];
const approvalLabels = { NO_AUDIO: 'Chưa có âm thanh', ALL_APPROVED: 'Đã duyệt toàn bộ', PARTIAL: 'Đã duyệt một phần', NONE_APPROVED: 'Chưa duyệt' };

export function AdminProjectsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'ALL'>('ALL');
  const [mediaType, setMediaType] = useState<MediaType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [approvalProject, setApprovalProject] = useState<AdminProject | null>(null);
  const { data, loading, error, retry } = useProjects({ search, status, mediaType, page, limit: 10 });
  const filtered = Boolean(search.trim() || status !== 'ALL' || mediaType !== 'ALL');
  const reset = () => { setSearch(''); setStatus('ALL'); setMediaType('ALL'); setPage(1); };
  const closeApproval = () => {
    const id = approvalProject?.id;
    setApprovalProject(null);
    requestAnimationFrame(() => {
      const target = document.getElementById(`approve-project-${id}`) ?? document.getElementById('project-search');
      target?.focus();
    });
  };
  return <div className="projects-page">
    <AdminPageHeader title="Dự án thuyết minh" description="Theo dõi toàn bộ dự án thuyết minh trong hệ thống." />
    <Card className="projects-list-card">
      <div className="projects-filters">
        <SearchField id="project-search" label="Tìm kiếm dự án" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm theo dự án hoặc người tạo..." />
        <FilterSelect label="Trạng thái" value={status} onChange={e => { setStatus(e.target.value as ProjectStatus | 'ALL'); setPage(1); }}>
          <option value="ALL">Tất cả trạng thái</option>{projectStatuses.map(value => <option key={value} value={value}>{value}</option>)}
        </FilterSelect>
        <FilterSelect label="Phương tiện" value={mediaType} onChange={e => { setMediaType(e.target.value as MediaType | 'ALL'); setPage(1); }}>
          <option value="ALL">Tất cả phương tiện</option><option value="VIDEO">Video</option><option value="AUDIO">Âm thanh</option>
        </FilterSelect>
        {filtered && <Button variant="ghost" onClick={reset}>Đặt lại</Button>}
      </div>
      <div className="projects-result-summary" role="status" aria-atomic="true">
        {loading ? 'Đang tải danh sách dự án…' : error || !data ? 'Chưa tải được kết quả.' : `${data.pagination.total.toLocaleString('vi-VN')} kết quả${filtered ? ' theo bộ lọc' : ''} · Trang ${data.pagination.totalPages ? data.pagination.page : 0}/${data.pagination.totalPages}`}
      </div>
      <LoadingState loading={loading} label="">
        {loading ? <div className="projects-table-skeleton" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i} className="skeleton-block skeleton-row" />)}</div> : error || !data ?
          <ErrorState title="Không thể tải danh sách dự án" description="Hãy kiểm tra kết nối và thử lại. Các điều kiện tìm kiếm được giữ nguyên." onRetry={retry} /> :
          data.items.length ? <>
            <DataTable caption="Danh sách dự án thuyết minh" className="projects-table" minWidth={1100}>
              <thead><tr>{['Dự án', 'Người tạo', 'Ngôn ngữ', 'Phương tiện', 'Trạng thái', 'Tiến độ', 'Phê duyệt', 'Thao tác'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
              <tbody>{data.items.map(p => {
                const isCompleted = p.status === 'COMPLETED';
                const isApproved = isCompleted && p.narrationApproval?.status === 'ALL_APPROVED';
                return <tr key={p.id}>
                  <td className="projects-name"><strong>{p.name}</strong><small>{p.id}</small></td>
                  <td className="projects-owner">{p.customerName}</td>
                  <td>{p.sourceLanguage.toUpperCase()} → {p.targetLanguages.map(x => x.toUpperCase()).join(', ') || '—'}</td>
                  <td>{p.mediaType === 'VIDEO' ? 'Video' : p.mediaType === 'AUDIO' ? 'Âm thanh' : 'Chưa tải lên'}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td><OperationProgress value={p.progress} label={`Tiến độ ${p.name}`} />{p.progress === 100 && !isCompleted && <small className="projects-progress-note">Trạng thái chưa phải Hoàn thành</small>}</td>
                  <td>{p.narrationApproval ? <><Badge tone={isApproved ? 'success' : 'neutral'}>{approvalLabels[p.narrationApproval.status]}</Badge><small>{p.narrationApproval.approved}/{p.narrationApproval.total} âm thanh</small></> : <span className="projects-secondary">Chưa có thông tin</span>}</td>
                  <td><div className="projects-row-actions">
                    <Link to={`/projects/${p.id}`} className="button button--ghost" aria-label={`Xem chi tiết dự án ${p.name}`}>Xem</Link>
                    <Button id={`approve-project-${p.id}`} variant="secondary" disabled={!isCompleted} onClick={() => isCompleted && setApprovalProject(p)}
                      aria-label={`Xem và phê duyệt âm thanh dự án ${p.name}`} aria-describedby={!isCompleted ? `approval-reason-${p.id}` : undefined}
                      title={!isCompleted ? 'Chỉ có thể duyệt khi dự án đã hoàn thành' : isApproved ? 'Đã duyệt phát hành (Bấm để xem/chỉnh sửa)' : 'Chưa duyệt phát hành (Bấm để duyệt)'}>Duyệt</Button>
                  </div>{!isCompleted && <small id={`approval-reason-${p.id}`}>Chỉ duyệt khi dự án hoàn thành</small>}</td>
                </tr>;
              })}</tbody>
            </DataTable>
            <Pagination value={data.pagination} onPage={setPage} label="Phân trang dự án" displayedCount={data.items.length} />
          </> : <EmptyState icon="projects" title={filtered ? 'Không tìm thấy dự án phù hợp.' : 'Chưa có dự án nào.'}
            description={filtered ? 'Hãy thay đổi từ khóa, trạng thái hoặc phương tiện.' : 'Danh sách sẽ xuất hiện khi hệ thống có dự án thuyết minh.'}
            action={filtered ? <Button variant="secondary" onClick={reset}>Đặt lại bộ lọc</Button> : undefined} />}
      </LoadingState>
    </Card>
    {approvalProject && <NarrationApprovalModal project={approvalProject} onClose={closeApproval} onUpdated={retry} />}
  </div>;
}
