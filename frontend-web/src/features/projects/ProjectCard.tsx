import { ProgressBar } from '../../components/common/ProgressBar'
import type { Project } from './types'
import { formatLanguagePair, formatRelativeDate, isProcessingStatus } from './projectUtils'
import { ProjectStatusBadge } from './ProjectStatusBadge'

export function ProjectCard({ project, compact = false }: { project: Project; compact?: boolean }) {
  const showProgress = isProcessingStatus(project.status) && project.progress !== undefined
  return (
    <article className={`project-card${compact ? ' project-card--compact' : ''}`}>
      <div className="project-card__main"><div className="project-card__media" aria-hidden="true">{project.mediaType === 'VIDEO' ? 'V' : 'A'}</div><div><h3>{project.name}</h3><p>{formatLanguagePair(project)} · {project.mediaType === 'VIDEO' ? 'Video' : 'Audio'}</p></div></div>
      <div className="project-card__status"><ProjectStatusBadge status={project.status} />{showProgress && <div className="project-card__progress"><ProgressBar value={project.progress ?? 0} showValue={false} /><span>{project.progress}%</span></div>}</div>
      <time dateTime={project.updatedAt}>Updated {formatRelativeDate(project.updatedAt)}</time>
    </article>
  )
}
