import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Spinner } from '../components/common/Spinner'
import { PageHeader } from '../components/layout/PageHeader'
import { ProjectCard } from '../features/projects/ProjectCard'
import { StatCard } from '../features/projects/StatCard'
import { calculateProjectStatistics, getRecentProjects } from '../features/projects/projectUtils'
import { useProjects } from '../features/projects/useProjects'

export function DashboardPlaceholder() {
  const { projects, isLoading, error } = useProjects()

  if (isLoading) return <Card><div className="project-loading"><Spinner size="lg" /><p>Loading dashboard...</p></div></Card>
  if (error) return <Card><ErrorState title="Unable to load projects" description={error} onRetry={() => undefined} /></Card>

  const statistics = calculateProjectStatistics(projects)
  const recentProjects = getRecentProjects(projects)

  return (
    <>
      <PageHeader title="Dashboard" description="Manage your multilingual narration projects." actions={<Link className="button button--primary button--md" to="/projects/new">New Project</Link>} />
      {projects.length === 0 ? <Card><EmptyState title="No projects yet" description="Create your first multilingual narration project." action={<Link className="button button--primary button--md" to="/projects/new">Create Project</Link>} /></Card> : <>
        <section className="stats-grid" aria-label="Project statistics">
          <StatCard label="Total Projects" value={statistics.total} supportingText="All narration projects" />
          <StatCard label="Completed" value={statistics.completed} supportingText="Ready to review" tone="success" />
          <StatCard label="Processing" value={statistics.processing} supportingText="Currently in progress" tone="info" />
          <StatCard label="Failed" value={statistics.failed} supportingText="Needs attention" tone="error" />
        </section>
        <section className="project-section">
          <div className="section-heading"><div><h2>Recent Projects</h2><p>Your most recently updated work.</p></div><Link to="/projects">View all</Link></div>
          <Card padding="sm" className="project-list">{recentProjects.map((project) => <ProjectCard key={project.id} project={project} compact />)}</Card>
        </section>
      </>}
    </>
  )
}
