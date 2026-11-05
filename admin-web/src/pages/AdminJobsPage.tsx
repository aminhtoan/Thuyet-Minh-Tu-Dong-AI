import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { SearchField, FilterSelect } from '../components/common/FormFields';
import { DataTable } from '../components/common/DataTable';
import { Pagination } from '../components/common/Pagination';
import { OperationProgress } from '../components/operations/OperationsCommon';
import { useJobs } from '../hooks/useOperations';
import { formatDate } from '../utils/dashboardFormat';
import { formatDuration, jobTypeLabels } from '../utils/operationsFormat';
import type { ProcessingJobStatus, ProcessingJobType } from '../types/domain';
import type { JobSummary } from '../types/operations';
import '../styles/operations.css';
import '../styles/jobs.css';

const statusLabels: Record<ProcessingJobStatus, string> = { QUEUED: 'Đang chờ', PROCESSING: 'Đang xử lý', COMPLETED: 'Hoàn thành', FAILED: 'Thất bại', CANCELLED: 'Đã hủy' };

export function AdminJobsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ProcessingJobType | 'ALL'>('ALL');
  const [status, setStatus] = useState<ProcessingJobStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const { data, loading, error, retry } = useJobs({ search, type, status, page, limit: 10 });
  const [lastSummary, setLastSummary] = useState<JobSummary | null>(null);
  if (data && data.summary !== lastSummary) setLastSummary(data.summary);
  const summary = data?.summary ?? lastSummary;
  const filtered = Boolean(search.trim() || type !== 'ALL' || status !== 'ALL');
  const reset = () => { setSearch(''); setType('ALL'); setStatus('ALL'); setPage(1); };
  return <div className="jobs-page">
    <AdminPageHeader title="Công việc xử lý" description="Theo dõi các tác vụ xử lý AI và phương tiện của hệ thống." />
    <div className="statistics jobs-statistics" aria-label="Tổng quan công việc xử lý">
      {summary ? <>
        <StatCard label="Đang chờ" value={summary.queued} icon="jobs" description="Trong hàng đợi" tone="warning" />
        <StatCard label="Đang xử lý" value={summary.processing} icon="jobs" description="Đang thực hiện" />
        <StatCard label="Hoàn thành" value={summary.completed} icon="check" description="Đã hoàn tất" />
        <StatCard label="Thất bại" value={summary.failed} icon="alert" description="Cần chú ý" tone="danger" />
      </> : <p className="jobs-kpi-placeholder">{error ? 'Chưa tải được số liệu tổng quan.' : 'Đang tải số liệu tổng quan…'}</p>}
    </div>
    {summary && (loading || error) && <p className="jobs-summary-note">Số liệu tổng quan từ lần tải thành công gần nhất.</p>}
    <Card className="jobs-list-card">
      <div className="jobs-filters">
        <SearchField id="job-search" label="Tìm kiếm công việc" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm theo dự án hoặc mã công việc..." />
        <FilterSelect label="Loại công việc" value={type} onChange={e => { setType(e.target.value as ProcessingJobType | 'ALL'); setPage(1); }}>
          <option value="ALL">Tất cả loại</option>{Object.entries(jobTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </FilterSelect>
        <FilterSelect label="Trạng thái" value={status} onChange={e => { setStatus(e.target.value as ProcessingJobStatus | 'ALL'); setPage(1); }}>
          <option value="ALL">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </FilterSelect>
        {filtered && <Button variant="ghost" onClick={reset}>Đặt lại</Button>}
      </div>
      <div className="jobs-result-summary" role="status" aria-atomic="true">
        {loading ? 'Đang tải danh sách công việc…' : error || !data ? 'Chưa tải được kết quả.' : `${data.pagination.total.toLocaleString('vi-VN')} công việc${filtered ? ' theo bộ lọc' : ''} · Trang ${data.pagination.totalPages ? data.pagination.page : 0}/${data.pagination.totalPages}`}
      </div>
      <LoadingState loading={loading} label="">
        {loading ? <div className="jobs-table-skeleton" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div> : error || !data ?
          <ErrorState title="Không thể tải công việc xử lý" description="Hãy kiểm tra kết nối và thử lại. Các điều kiện tìm kiếm được giữ nguyên." onRetry={retry} /> :
          data.items.length ? <>
            <DataTable caption="Danh sách công việc xử lý" className="jobs-table" minWidth={1150}>
              <thead><tr>{['Công việc', 'Dự án', 'Loại', 'Trạng thái', 'Tiến độ', 'Bắt đầu', 'Thời gian', 'Thao tác'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
              <tbody>{data.items.map(job => <tr key={job.id}>
                <td className="jobs-id"><details><summary aria-label={`Xem mã đầy đủ của công việc ${job.id}`}>{job.id.length > 16 ? `${job.id.slice(0, 8)}…${job.id.slice(-6)}` : job.id}</summary><code>{job.id}</code></details></td>
                <td className="jobs-project">{job.projectName}</td>
                <td>{jobTypeLabels[job.type]}</td>
                <td><StatusBadge status={job.status} /></td>
                <td><OperationProgress value={job.progress} label={`Tiến độ công việc ${job.id}`} />{job.progress === 100 && job.status !== 'COMPLETED' && <small className="jobs-progress-note">Trạng thái chưa phải Hoàn thành</small>}</td>
                <td className="jobs-date">{job.startedAt ? formatDate(job.startedAt) : '—'}</td>
                <td>{formatDuration(job.startedAt, job.completedAt)}</td>
                <td><Link className="button button--ghost jobs-view" to={`/jobs/${job.id}`} aria-label={`Xem chi tiết công việc ${job.id}`}>Xem</Link></td>
              </tr>)}</tbody>
            </DataTable>
            <Pagination value={data.pagination} onPage={setPage} label="Phân trang công việc" displayedCount={data.items.length} />
          </> : <EmptyState icon="jobs" title={filtered ? 'Không tìm thấy công việc phù hợp.' : 'Chưa có công việc xử lý.'}
            description={filtered ? 'Hãy thay đổi từ khóa, loại công việc hoặc trạng thái.' : 'Các tác vụ xử lý sẽ xuất hiện tại đây khi hệ thống có dữ liệu.'}
            action={filtered ? <Button variant="secondary" onClick={reset}>Đặt lại bộ lọc</Button> : undefined} />}
      </LoadingState>
    </Card>
  </div>;
}
