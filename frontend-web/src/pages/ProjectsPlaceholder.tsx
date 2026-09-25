import { ProjectListHeader } from '../features/projects/ProjectListHeader';
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Spinner } from '../components/common/Spinner'
import { PageHeader } from '../components/layout/PageHeader'
import { ProjectCard } from '../features/projects/ProjectCard'
import { ProjectFilters } from '../features/projects/ProjectFilters'
import { filterProjects } from '../features/projects/projectUtils'
import type { ProjectStatusFilter } from '../features/projects/types'
import { useProjects } from '../features/projects/useProjects'

export function ProjectsPlaceholder() {
  const { projects, isLoading, error } = useProjects()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const setQuery = (value: string) => setParams(value ? { q: value } : {}, { replace: true })
  const [status, setStatus] = useState<ProjectStatusFilter>('ALL')
  const filteredProjects = useMemo(() => filterProjects(projects, query, status), [projects, query, status])
  const hasActiveFilters = Boolean(query.trim()) || status !== 'ALL'

  return (
    <>
      <PageHeader title="Dự án" description="Quản lý nội dung và tiếp tục hành trình thuyết minh của bạn." actions={<Link className="button button--primary button--md" to="/projects/new">Dự án mới</Link>} />
      <Card className="projects-panel" padding="sm">
        <ProjectFilters query={query} status={status} onQueryChange={setQuery} onStatusChange={setStatus} />
        {isLoading ? <div className="project-loading"><Spinner size="lg" /><p>Loading projects...</p></div> : error ? <ErrorState title="Unable to load projects" description={error} onRetry={() => undefined} /> : filteredProjects.length > 0 ? <div className="project-list"><ProjectListHeader />{filteredProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</div> : projects.length === 0 ? <EmptyState title="No projects yet" description="Create your first multilingual narration project." action={<Link className="button button--primary button--md" to="/projects/new">New Project</Link>} /> : <EmptyState title="No projects found" description="Try adjusting your search or status filter." action={hasActiveFilters ? <button className="button button--secondary button--md" type="button" onClick={() => { setQuery(''); setStatus('ALL') }}>Clear filters</button> : undefined} />}
      </Card>
    </>
  )
}
