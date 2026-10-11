import { ProjectListHeader } from '../features/projects/ProjectListHeader';
import { useSearchParams } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { ErrorState } from '../components/common/ErrorState'
import { Icon } from '../components/common/Icon'
import { Spinner } from '../components/common/Spinner'
import { ProjectCard } from '../features/projects/ProjectCard'
import { ProjectFilters } from '../features/projects/ProjectFilters'
import type { ProjectStatus, ProjectStatusFilter } from '../features/projects/types'
import { useProjectPage } from '../features/projects/useProjects'

const projectStatuses = new Set<ProjectStatus>(['DRAFT', 'UPLOADED', 'TRANSCRIBING', 'TRANSCRIBED', 'TRANSLATING', 'TRANSLATED', 'GENERATING_AUDIO', 'PROCESSING_VIDEO', 'COMPLETED', 'FAILED'])

function ProjectsEmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  const titleId = filtered ? 'projects-no-results-title' : 'projects-empty-title'
  return <section className={`projects-empty${filtered ? ' projects-empty--filtered' : ''}`} aria-labelledby={titleId}>
    <span className="projects-empty__icon" aria-hidden="true"><Icon name="projects" width="44" /></span>
    <h2 id={titleId}>{filtered ? 'Không tìm thấy dự án' : 'Chưa có dự án'}</h2>
    <p>{filtered ? 'Hãy điều chỉnh từ khóa hoặc bộ lọc trạng thái.' : 'Chưa có dự án nào. Chọn “Tạo thuyết minh” trong menu bên trái để bắt đầu.'}</p>
    {filtered && <button className="button button--secondary button--md" type="button" onClick={onClear}>Xóa bộ lọc</button>}
  </section>
}

export function ProjectsPlaceholder() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const requestedStatus = params.get('status')
  const status: ProjectStatusFilter = requestedStatus && projectStatuses.has(requestedStatus as ProjectStatus) ? requestedStatus as ProjectStatus : 'ALL'
  const requestedPage = Number(params.get('page') ?? '1')
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const { projects, pagination, isLoading, error, reload } = useProjectPage({ page, limit: 10, search: query || undefined, status: status === 'ALL' ? undefined : status })
  const updateParams = (next: { q?: string; status?: ProjectStatusFilter; page?: number }) => {
    const values = new URLSearchParams(params)
    if (next.q !== undefined) { if (next.q.trim()) values.set('q', next.q); else values.delete('q'); }
    if (next.status !== undefined) { if (next.status === 'ALL') values.delete('status'); else values.set('status', next.status); }
    if (next.page && next.page > 1) values.set('page', String(next.page)); else values.delete('page')
    setParams(values, { replace: true })
  }
  const setQuery = (value: string) => updateParams({ q: value, page: 1 })
  const setStatus = (value: ProjectStatusFilter) => updateParams({ status: value, page: 1 })
  const hasActiveFilters = Boolean(query.trim()) || status !== 'ALL'

  return (
    <>
      <Card className="projects-panel" padding="sm">
        <ProjectFilters query={query} status={status} onQueryChange={setQuery} onStatusChange={setStatus} />
        {isLoading ? <div className="project-loading" role="status"><Spinner size="lg" label="Đang tải dự án" /><p>Đang tải dự án...</p></div> : error ? <ErrorState title="Không thể tải dự án" description={error} onRetry={reload} /> : projects.length > 0 ? <><div className="project-list"><ProjectListHeader />{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div><nav className="project-pagination" aria-label="Phân trang dự án"><button className="button button--secondary button--sm" type="button" disabled={pagination.page <= 1} onClick={() => updateParams({ page: pagination.page - 1 })}>Trang trước</button><span aria-live="polite">Trang {pagination.page} / {Math.max(1, pagination.totalPages)} · {pagination.total} dự án</span><button className="button button--secondary button--sm" type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => updateParams({ page: pagination.page + 1 })}>Trang sau</button></nav></> : <ProjectsEmptyState filtered={hasActiveFilters} onClear={() => setParams({}, { replace: true })} />}
      </Card>
    </>
  )
}
