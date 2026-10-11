import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Spinner } from '../components/common/Spinner'
import { Icon } from '../components/common/Icon'
import { ProjectStatusBadge } from '../features/projects/ProjectStatusBadge'
import { projectListLanguagePair, projectListPage } from '../features/projects/projectListPresentation'
import { createHistoryDemo, isHistoryDemoEnabled } from '../features/results/historyDemo'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import { projectStatusLabels } from '../localization/statusLabels.mjs'
import { defaultHistoryFilters, filterHistory, historyDateError } from '../features/results/historyFilters'
import '../styles/history.css'
import type { Project, ProjectStatusFilter } from '../features/projects/types'
import { useCompleteHistory } from '../features/results/useCompleteHistory'
import { historyPageNumbers } from '../features/results/historyPagination'

export function HistoryPlaceholder() {
  return import.meta.env.DEV && isHistoryDemoEnabled(import.meta.env.DEV, import.meta.env.VITE_HISTORY_DEMO) ? <DemoHistory /> : <ApiHistory />
}
function ApiHistory() {
  const data = useCompleteHistory()
  return <HistoryView {...data} demo={false} />
}
function DemoHistory() {
  const projects = useMemo(() => createHistoryDemo(), [])
  return <HistoryView projects={projects} isLoading={false} error={null} reload={() => {}} demo />
}
function HistoryView({ projects, isLoading, error, reload, demo }: { projects: Project[]; isLoading: boolean; error: string | null; reload: () => void; demo: boolean }) {
  const [draft, setDraft] = useState(defaultHistoryFilters), [applied, setApplied] = useState(defaultHistoryFilters), [page, setPage] = useState(1), [validationError, setValidationError] = useState('')
  const matches = useMemo(() => filterHistory(projects, applied), [projects, applied])
  const pagination = projectListPage(matches, page)
  const { projects: filteredProjects, page: currentPage, totalPages } = pagination

  return <>
    <Card className="history-panel" padding="sm">
      {demo && <p className="history-demo-notice" role="note"><strong>Dữ liệu demo</strong> — Dữ liệu mô phỏng chỉ dùng để kiểm tra giao diện và bộ lọc, không có kết quả AI thật và không thực hiện nghiệp vụ.</p>}
      <form className="history-filters" onSubmit={event => { event.preventDefault(); const message = historyDateError(draft); setValidationError(message); if (!message) { setApplied({ ...draft, query: draft.query.trim() }); setPage(1) } }}>
        <Input className="history-search-field" label="Tìm kiếm dự án" placeholder="Nhập tên dự án..." type="search" value={draft.query} onChange={event => setDraft({ ...draft, query: event.target.value })} />
        <label className="project-filter-select"><span>Thời gian</span><select value={draft.period} onChange={event => setDraft({ ...draft, period: event.target.value })}>{[['ALL', 'Tất cả thời gian'], ['TODAY', 'Hôm nay'], ['WEEK', '7 ngày gần đây'], ['MONTH', 'Tháng này'], ['YEAR', 'Năm nay'], ['CUSTOM', 'Khoảng ngày tùy chọn']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="project-filter-select"><span>Trạng thái</span><select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as ProjectStatusFilter })}><option value="ALL">Tất cả trạng thái</option>{Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <Button type="submit" disabled={isLoading}><Icon name="search" width="18" /> Tìm kiếm</Button>
        {draft.period === 'CUSTOM' && <div className="history-date-range"><Input label="Từ ngày" type="date" value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} /><Input label="Đến ngày" type="date" value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })} /></div>}
        {validationError && <p role="alert" className="history-filter-error">{validationError}</p>}
      </form>
      {isLoading ? <div className="project-loading" role="status"><Spinner size="lg" /><p>Đang tải lịch sử...</p></div>
        : error ? <ErrorState title="Không thể tải dự án" description={error} onRetry={reload} />
: filteredProjects.length > 0 ? <div className="history-table-scroll" tabIndex={0} role="region" aria-label="Bảng lịch sử dự án"><table className="history-table"><caption className="visually-hidden">Lịch sử dự án thuyết minh theo ngày tạo</caption><thead><tr>{['Tên dự án', 'Ngôn ngữ', 'Ngày tạo', 'Trạng thái', 'Thao tác'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{filteredProjects.map(project => <tr key={project.id}><td><strong className="history-project-name" title={project.name} tabIndex={0}>{project.name}</strong></td><td>{projectListLanguagePair(project)}</td><td>{project.createdAt && Number.isFinite(Date.parse(project.createdAt)) ? <time dateTime={project.createdAt}>{new Date(project.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</time> : '—'}</td><td><ProjectStatusBadge status={project.status} /></td><td>{demo ? <span className="history-readonly">Chỉ xem demo</span> : <Link className="history-detail-link" to={'/projects/' + project.id} aria-label={'Xem chi tiết dự án ' + project.name}>Xem chi tiết</Link>}</td></tr>)}</tbody></table></div>
            : projects.length === 0 ? <section className="state history-empty" aria-labelledby="history-empty-title"><Icon name="history" width="44" /><h2 id="history-empty-title">Chưa có lịch sử</h2><p>Các dự án và kết quả thuyết minh của bạn sẽ xuất hiện tại đây.</p></section>
              : <EmptyState title="Không tìm thấy lịch sử phù hợp" description="Hãy thử thay đổi từ khóa hoặc bộ lọc." />}
      {!isLoading && !error && matches.length > 0 && <div className="history-pagination-block"><p className="history-pagination-summary" aria-live="polite">Hiển thị {pagination.from}–{pagination.to} / {pagination.total} bản ghi</p><nav className="history-pagination" aria-label="Phân trang lịch sử"><Button variant="secondary" aria-label="Đến trang trước" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trang trước</Button>{historyPageNumbers(currentPage, totalPages).map((number, index) => number === '…' ? <span key={'gap-' + index} aria-hidden="true">…</span> : <Button key={number} variant="secondary" className={'history-page-number' + (number === currentPage ? ' history-page-number--active' : '')} aria-label={'Đến trang ' + number} aria-current={number === currentPage ? 'page' : undefined} onClick={() => setPage(number)}>{number}</Button>)}<Button variant="secondary" aria-label="Đến trang sau" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Trang sau</Button></nav></div>}
    </Card>
  </>
}
