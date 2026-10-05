import type { Project } from './types';
export function projectAction(project: Project) {
  if (project.status === 'COMPLETED') return { step: 'result' as const, label: 'Xem kết quả' };
  if (project.status === 'UPLOADED' || project.status === 'DRAFT') return { step: 'transcript' as const, label: 'Open transcript' };
  return { step: 'generate' as const, label: project.status === 'FAILED' ? 'Thử xử lý lại' : 'Xem tiến trình xử lý' };
}

