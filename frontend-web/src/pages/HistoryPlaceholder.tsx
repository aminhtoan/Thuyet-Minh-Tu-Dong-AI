import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Spinner } from '../components/common/Spinner'
import { Icon } from '../components/common/Icon'
import { ProjectStatusBadge } from '../features/projects/ProjectStatusBadge'
import { formatLanguagePair } from '../features/projects/projectUtils'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import { projectStatusLabels } from '../localization/statusLabels.mjs'
import { defaultHistoryFilters, filterHistory, historyDateError } from '../features/results/historyFilters'
import '../styles/history.css'
import type { ProjectStatusFilter } from '../features/projects/types'
import { useCompleteHistory } from '../features/results/useCompleteHistory'

export function HistoryPlaceholder() {
  const { projects, isLoading, error, reload } = useCompleteHistory()
  const [draft, setDraft] = useState(defaultHistoryFilters), [applied, setApplied] = useState(defaultHistoryFilters), [page, setPage] = useState(1), [validationError, setValidationError] = useState('')
  const matches = useMemo(() => filterHistory(projects, applied), [projects, applied])
  const totalPages = Math.max(1, Math.ceil(matches.length / 10)), currentPage = Math.min(page, totalPages)
  const filteredProjects = matches.slice((currentPage - 1) * 10, currentPage * 10)

  return <>
    <Card className="history-panel" padding="sm">
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
          : filteredProjects.length > 0 ? <div className="history-table-scroll" tabIndex={0} role="region" aria-label="Bảng lịch sử dự án"><table className="history-table"><caption className="visually-hidden">Lịch sử cập nhật dự án thuyết minh</caption><thead><tr>{['Tên dự án', 'Loại phương tiện', 'Ngôn ngữ', 'Cập nhật lúc', 'Trạng thái', 'Hành động'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{filteredProjects.map(project => <tr key={project.id}><td data-label="Tên dự án"><strong>{project.name}</strong></td><td data-label="Loại phương tiện">{project.mediaType === 'VIDEO' ? 'Video' : project.mediaType === 'AUDIO' ? 'Âm thanh' : 'Chưa có phương tiện'}</td><td data-label="Ngôn ngữ">{formatLanguagePair(project)}</td><td data-label="Cập nhật lúc"><time dateTime={project.updatedAt}>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(project.updatedAt))}</time></td><td data-label="Trạng thái"><ProjectStatusBadge status={project.status} /></td><td data-label="Hành động"><Link className="history-detail-link" to={'/projects/' + project.id} aria-label={'Xem chi tiết dự án ' + project.name}>Xem chi tiết</Link></td></tr>)}</tbody></table></div>
            : projects.length === 0 ? <section className="state history-empty" aria-labelledby="history-empty-title"><Icon name="history" width="44" /><h2 id="history-empty-title">Chưa có lịch sử</h2><p>Các dự án và kết quả thuyết minh của bạn sẽ xuất hiện tại đây.</p></section>
              : <EmptyState title="Không tìm thấy lịch sử phù hợp" description="Hãy thử thay đổi từ khóa hoặc bộ lọc." />}
      {!isLoading && !error && matches.length > 0 && <nav className="project-pagination" aria-label="Phân trang lịch sử"><Button variant="secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trang trước</Button><span aria-live="polite">Trang {currentPage}/{totalPages} · {matches.length} dự án</span><Button variant="secondary" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Trang sau</Button></nav>}
    </Card>
  </>
}
