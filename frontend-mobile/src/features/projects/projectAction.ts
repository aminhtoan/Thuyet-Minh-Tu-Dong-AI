import type { Project } from './types';
export function projectAction(project: Project) {
  if (project.status === 'COMPLETED') return { step: 'result' as const, label: 'View Result' };
  if (project.status === 'UPLOADED' || project.status === 'DRAFT') return { step: 'transcript' as const, label: 'Open transcript' };
  return { step: 'generate' as const, label: project.status === 'FAILED' ? 'Retry Processing' : 'View Processing' };
}

