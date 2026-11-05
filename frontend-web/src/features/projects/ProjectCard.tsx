import { Link } from 'react-router-dom';
import { Icon } from '../../components/common/Icon';
import { ProgressBar } from '../../components/common/ProgressBar';
import { projectAction } from './projectAction';
import { formatLanguagePair, formatRelativeDate, isProcessingStatus } from './projectUtils';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import type { Project } from './types';
import { sourceLanguageLabel, sourceState } from './sourceLanguage';
export function ProjectCard({ project, compact = false }: { project: Project; compact?: boolean }) {
  const action = projectAction(project);
  return <article className={'project-card' + (compact ? ' project-card--compact' : '')}>
    <div className="project-card__main"><span className={'project-card__media project-card__media--' + (project.mediaType ?? 'AUDIO').toLowerCase()}><Icon name={project.mediaType === 'VIDEO' ? 'video' : 'mic'} width="22" /></span><div><h3><Link to={'/projects/' + project.id}>{project.name}</Link></h3><p>{project.mediaType === 'VIDEO' ? 'Video' : project.mediaType === 'AUDIO' ? 'Âm thanh' : 'Chưa có media'}</p></div></div>
    <span className="project-card__language" title={formatLanguagePair(project)}>{sourceLanguageLabel(sourceState(project).language)} <Icon name="arrow" width="12" /> {project.targetLanguage?.toUpperCase() ?? '—'}</span>
    <div className="project-card__status"><ProjectStatusBadge status={project.status} />{isProcessingStatus(project.status) && project.progress !== undefined && <div className="project-card__progress"><ProgressBar value={project.progress} showValue={false} /><span>{project.progress}%</span></div>}</div>
    <div className="project-card__end"><Link className="project-card__transcript-link" to={action.path} title={action.reason}>{action.label}</Link>{!compact && <time dateTime={project.updatedAt}>{formatRelativeDate(project.updatedAt)}</time>}</div>
  </article>;
}
