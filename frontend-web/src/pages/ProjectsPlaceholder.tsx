import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState, type FormEvent } from 'react'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import { projectStatusLabels } from '../localization/statusLabels.mjs'
import { filterAndSortProjects } from '../features/projects/projectListFilters'
import { historyDateError } from '../features/results/historyFilters'
import { useCompleteHistory } from '../features/results/useCompleteHistory'
import '../styles/project-list.css'
import { Card } from '../components/common/Card'
import { ErrorState } from '../components/common/ErrorState'
import { Icon } from '../components/common/Icon'
import { Spinner } from '../components/common/Spinner'
import { ProjectStatusBadge } from '../features/projects/ProjectStatusBadge'
import { projectAction } from '../features/projects/projectAction'
import { projectListLanguagePair, projectListPage } from '../features/projects/projectListPresentation'
import { createDemoProjects, isProjectDemoEnabled } from '../features/projects/projectDemo'
import type { Project, ProjectStatus, ProjectStatusFilter } from '../features/projects/types'

const projectStatuses = new Set<ProjectStatus>(['DRAFT', 'UPLOADED', 'TRANSCRIBING', 'TRANSCRIBED', 'TRANSLATING', 'TRANSLATED', 'GENERATING_AUDIO', 'PROCESSING_VIDEO', 'COMPLETED', 'FAILED'])

function ProjectsEmptyState({ filtered }: { filtered: boolean }) {
  const titleId = filtered ? 'projects-no-results-title' : 'projects-empty-title'
  return <section className={`projects-empty${filtered ? ' projects-empty--filtered' : ''}`} aria-labelledby={titleId}>
    <span className="projects-empty__icon" aria-hidden="true"><Icon name="projects" width="44" /></span>
    <h2 id={titleId}>{filtered ? 'Không tìm thấy dự án phù hợp' : 'Chưa có dự án'}</h2>
    <p>{filtered ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc.' : "Chọn 'Tạo thuyết minh' trong menu bên trái để bắt đầu."}</p>
  </section>
}

function ProjectMedia({ mediaType }: { mediaType?: Project['mediaType'] }) {
  if (mediaType === 'VIDEO') return <span className="project-list-media"><Icon name="video" width="18" /><span>Video</span></span>
  if (mediaType === 'AUDIO') return <span className="project-list-media"><Icon name="wave" width="18" /><span>Âm thanh</span></span>
  return <span className="project-list-media project-list-media--empty">Chưa có tệp</span>
}

export function ProjectsPlaceholder() {
  return import.meta.env.DEV && isProjectDemoEnabled(import.meta.env.DEV, import.meta.env.VITE_PROJECT_LIST_DEMO) ? <DemoProjectList /> : <ApiProjectList />
}

function ApiProjectList() {
  const data = useCompleteHistory()
  return <ProjectListView {...data} demo={false} />
}

function DemoProjectList() {
  const projects = useMemo(() => createDemoProjects(), [])
  return <ProjectListView projects={projects} isLoading={false} error={null} reload={() => {}} demo />
}

function ProjectListView({ projects: allProjects, isLoading, error, reload, demo }: { projects: Project[]; isLoading: boolean; error: string | null; reload: () => void; demo: boolean }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const requestedStatus = params.get('status')
  const status: ProjectStatusFilter = requestedStatus && projectStatuses.has(requestedStatus as ProjectStatus) ? requestedStatus as ProjectStatus : 'ALL'
  const requestedPage = Number(params.get('page') ?? '1')
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const applied = useMemo(() => ({ query, status, period: ['ALL', 'TODAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM'].includes(params.get('period') ?? '') ? params.get('period')! : 'ALL', from: params.get('from') ?? '', to: params.get('to') ?? '', sort: ['NEWEST', 'OLDEST', 'NAME_ASC', 'NAME_DESC'].includes(params.get('sort') ?? '') ? params.get('sort')! : 'NEWEST' }), [params, query, status])
  const [draft, setDraft] = useState(applied), [validationError, setValidationError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [previousApplied, setPreviousApplied] = useState(applied)
  if (previousApplied !== applied) { setPreviousApplied(applied); setDraft(applied); setValidationError('') }
  const matches = useMemo(() => historyDateError(applied) ? [] : filterAndSortProjects(allProjects, applied), [allProjects, applied])
  const pagination = projectListPage(matches, page)
  const { projects } = pagination
  const updateParams = (next: { q?: string; status?: ProjectStatusFilter; page?: number }) => {
    const values = new URLSearchParams(params)
    if (next.q !== undefined) { if (next.q.trim()) values.set('q', next.q); else values.delete('q'); }
    if (next.status !== undefined) { if (next.status === 'ALL') values.delete('status'); else values.set('status', next.status); }
    if (next.page && next.page > 1) values.set('page', String(next.page)); else values.delete('page')
    setParams(values, { replace: true })
  }
  const hasActiveFilters = allProjects.length > 0
  const activeAdvancedFilterCount = [applied.period !== 'ALL', applied.status !== 'ALL', applied.sort !== 'NEWEST'].filter(Boolean).length
  const resetDraftFilters = () => {
    setDraft({ query: '', status: 'ALL', period: 'ALL', from: '', to: '', sort: 'NEWEST' })
    setValidationError('')
  }
  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = historyDateError(draft)
    setValidationError(message)
    if (message) { setFiltersOpen(true); return }
    const next = new URLSearchParams()
    if (draft.query.trim()) next.set('q', draft.query.trim())
    if (draft.status !== 'ALL') next.set('status', draft.status)
    next.set('period', draft.period)
    next.set('sort', draft.sort)
    if (draft.period === 'CUSTOM') { next.set('from', draft.from); next.set('to', draft.to) }
    next.set('page', '1')
    setParams(next, { replace: true })
    setFiltersOpen(false)
  }

  return (
    <div className="projects-page">
      <Card className="projects-panel project-list-a" padding="sm">
        {demo && <p className="project-list-demo-notice" role="note"><strong>Dữ liệu demo</strong> — Chỉ dùng để kiểm tra giao diện và bộ lọc, không thực hiện thao tác thật.</p>}
        <form className="project-list-filters" onSubmit={submitFilters}>
          <div className="project-list-toolbar">
            <Input className="project-list-search" label="Tìm kiếm dự án" placeholder="Nhập tên dự án..." type="search" value={draft.query} onChange={event => setDraft({ ...draft, query: event.target.value })} />
            <Button
              className="project-list-filter-toggle"
              type="button"
              variant="secondary"
              aria-expanded={filtersOpen}
              aria-controls="project-list-advanced-filters"
              aria-label={activeAdvancedFilterCount > 0 ? `Bộ lọc, ${activeAdvancedFilterCount} bộ lọc nâng cao đang áp dụng` : 'Bộ lọc nâng cao'}
              onClick={() => setFiltersOpen(open => !open)}
            >
              <Icon name="settings" width="18" />
              <span>Bộ lọc</span>
              {activeAdvancedFilterCount > 0 && <span className="project-list-filter-count" aria-hidden="true"><span>{activeAdvancedFilterCount}</span><span className="project-list-filter-count__copy"> đang áp dụng</span></span>}
              <Icon className="project-list-filter-chevron" name="chevronDown" width="16" />
            </Button>
            <Button className="project-list-submit" type="submit" disabled={isLoading}><Icon name="search" width="18" /> Tìm kiếm</Button>
          </div>
          <div
            id="project-list-advanced-filters"
            className={`project-list-advanced${filtersOpen ? ' project-list-advanced--open' : ''}`}
            aria-hidden={!filtersOpen}
            inert={!filtersOpen ? true : undefined}
          >
            <div className="project-list-advanced__inner">
              <div className="project-list-advanced__grid">
                <label className="project-filter-select project-list-period"><span>Thời gian</span><select value={draft.period} onChange={event => setDraft({ ...draft, period: event.target.value })}>{[['ALL', 'Tất cả thời gian'], ['TODAY', 'Hôm nay'], ['WEEK', '7 ngày gần đây'], ['MONTH', 'Tháng này'], ['YEAR', 'Năm nay'], ['CUSTOM', 'Khoảng ngày tùy chọn']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="project-filter-select"><span>Trạng thái</span><select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as ProjectStatusFilter })}><option value="ALL">Tất cả trạng thái</option>{Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="project-filter-select"><span>Sắp xếp</span><select value={draft.sort} onChange={event => setDraft({ ...draft, sort: event.target.value })}>{[['NEWEST', 'Mới nhất'], ['OLDEST', 'Cũ nhất'], ['NAME_ASC', 'Tên A–Z'], ['NAME_DESC', 'Tên Z–A']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </div>
              {draft.period === 'CUSTOM' && <div className="project-list-dates"><Input label="Từ ngày" type="date" value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} /><Input label="Đến ngày" type="date" value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })} /></div>}
              {validationError && <p role="alert" className="project-list-error">{validationError}</p>}
              <div className="project-list-advanced__footer">
                <p>Đặt lại chỉ thay đổi lựa chọn đang soạn. Nhấn Tìm kiếm để áp dụng.</p>
                <Button type="button" variant="ghost" size="sm" onClick={resetDraftFilters}>Đặt lại</Button>
              </div>
            </div>
          </div>
        </form>
        {isLoading ? <div className="project-loading" role="status"><Spinner size="lg" label="Đang tải dự án" /><p>Đang tải dự án...</p></div> : error ? <ErrorState title="Không thể tải dự án" description={error} onRetry={reload} /> : projects.length > 0 ? <>
          <div className="project-list-table-scroll" tabIndex={0} role="region" aria-label="Danh sách dự án">
            <table className="project-list-table">
              <caption className="sr-only">Dự án của tôi</caption>
              <colgroup>
                <col className="project-list-column project-list-column--name" />
                <col className="project-list-column project-list-column--media" />
                <col className="project-list-column project-list-column--language" />
                <col className="project-list-column project-list-column--date" />
                <col className="project-list-column project-list-column--status" />
                <col className="project-list-column project-list-column--action" />
              </colgroup>
              <thead><tr>{['Tên dự án', 'Phương tiện', 'Ngôn ngữ', 'Ngày tạo', 'Trạng thái', 'Thao tác'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>{projects.map(project => {
                const createdDate = project.createdAt && Number.isFinite(Date.parse(project.createdAt))
                  ? new Date(project.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '—'
                const projectAccessibleName = `${project.name}, tạo ngày ${createdDate}, trạng thái ${projectStatusLabels[project.status]}, mã ${project.id}`
                const action = projectAction(project)
                return <tr key={project.id}>
                  <th scope="row">{demo
                    ? <span className="project-list-name" title={project.name} aria-label={`Dự án demo ${projectAccessibleName}`} tabIndex={0}>{project.name}</span>
                    : <Link className="project-list-name" title={project.name} aria-label={`Mở dự án ${projectAccessibleName}`} to={'/projects/' + project.id}>{project.name}</Link>}
                  </th>
                  <td><ProjectMedia mediaType={project.mediaType} /></td>
                  <td><span className="project-list-language" title={projectListLanguagePair(project)}>{projectListLanguagePair(project)}</span></td>
                  <td>{project.createdAt && createdDate !== '—' ? <time dateTime={project.createdAt}>{createdDate}</time> : '—'}</td>
                  <td className="project-list-status"><ProjectStatusBadge status={project.status} />{demo && <small className="project-list-simulated">Giả lập · Không có tệp thật</small>}</td>
                  <td>{demo
                    ? <span className="project-list-readonly" title="Thao tác nghiệp vụ không khả dụng với dữ liệu demo">Chỉ xem demo</span>
                    : <Link className="project-list-action" to={'/projects/' + project.id + '/' + action.step + (project.targetLanguage ? '?language=' + project.targetLanguage : '')} aria-label={`Tiếp tục dự án ${projectAccessibleName}`}><span>Tiếp tục</span><Icon name="arrow" width="16" /></Link>}
                  </td>
                </tr>
              })}</tbody>
            </table>
          </div>
          <nav className="project-pagination" aria-label="Phân trang dự án"><button className="button button--secondary button--sm" type="button" disabled={pagination.page <= 1} onClick={() => updateParams({ page: pagination.page - 1 })}>Trang trước</button><div className="project-list-pagination-summary"><span aria-live="polite">Hiển thị {pagination.from}–{pagination.to} / {pagination.total} dự án</span><span className="project-list-current-page" aria-current="page">Trang {pagination.page} / {pagination.totalPages}</span></div><button className="button button--secondary button--sm" type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => updateParams({ page: pagination.page + 1 })}>Trang sau</button></nav>
        </> : <ProjectsEmptyState filtered={hasActiveFilters} />}
      </Card>
    </div>
  )
}
