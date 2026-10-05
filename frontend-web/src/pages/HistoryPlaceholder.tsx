import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Spinner } from '../components/common/Spinner'
import { PageHeader } from '../components/layout/PageHeader'
import { ProjectCard } from '../features/projects/ProjectCard'
import { ProjectFilters } from '../features/projects/ProjectFilters'
import { ProjectListHeader } from '../features/projects/ProjectListHeader'
import { filterProjects } from '../features/projects/projectUtils'
import type { ProjectStatusFilter } from '../features/projects/types'
import { useHistory } from '../features/results/useHistory'

export function HistoryPlaceholder() {
  const { projects, isLoading, error, reload } = useHistory()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProjectStatusFilter>('ALL')
  const filteredProjects = useMemo(() => filterProjects(projects, query, status), [projects, query, status])
  const hasActiveFilters = Boolean(query.trim()) || status !== 'ALL'

  return <>
    <PageHeader title="Lịch sử" description="Lịch sử dự án mô phỏng. Chưa có tệp kết quả thực." actions={<Link className="button button--primary button--md" to="/projects/new">Dự án mới</Link>} />
    <Card className="projects-panel" padding="sm">
      <ProjectFilters query={query} status={status} onQueryChange={setQuery} onStatusChange={setStatus} />
      {isLoading ? <div className="project-loading"><Spinner size="lg" /><p>Đang tải dự án...</p></div>
        : error ? <ErrorState title="Không thể tải dự án" description={error} onRetry={reload} />
          : filteredProjects.length > 0 ? <div className="project-list"><ProjectListHeader />{filteredProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
            : projects.length === 0 ? <EmptyState title="Chưa có lịch sử" description="Hãy tạo dự án thuyết minh đa ngôn ngữ đầu tiên." action={<Link className="button button--primary button--md" to="/projects/new">Dự án mới</Link>} />
              : <EmptyState title="Không có lịch sử phù hợp" description="Hãy điều chỉnh từ khóa hoặc bộ lọc trạng thái." action={hasActiveFilters ? <button className="button button--secondary button--md" type="button" onClick={() => { setQuery(''); setStatus('ALL') }}>Xóa bộ lọc</button> : undefined} />}
    </Card>
  </>
}
