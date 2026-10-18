import type { ProjectWorkflow, WorkflowStep } from './types';
import { resolveWorkflowRouteAccess, type WorkflowDestination } from './workflowRouteGuard.ts';
import { workflowStepsPresentation } from './workflowStepsPresentation.ts';

export type WorkflowPageStep = Exclude<WorkflowStep, 'UNKNOWN'>;

export type WorkflowStepNavigation = {
  enabled: boolean
  path: string | null
  reason: string
};

const routeSegment: Record<WorkflowDestination, string> = {
  TRANSCRIPT: 'transcript',
  TRANSLATION: 'translation',
  VOICE: 'voice',
  GENERATE: 'generate',
  RESULT: 'result',
};

function disabled(reason: string): WorkflowStepNavigation {
  return { enabled: false, path: null, reason };
}

export function resolveWorkflowStepNavigation(
  workflow: ProjectWorkflow | undefined,
  projectId: string,
  destination: WorkflowPageStep,
  pageStep: WorkflowPageStep,
): WorkflowStepNavigation {
  if (!projectId.trim()) return disabled('Không xác định được dự án cần mở.');
  const presentation = workflowStepsPresentation(workflow);
  if (!presentation.trustworthy || !workflow) return disabled('Chưa có thông tin quy trình đáng tin cậy để mở bước này.');

  if (destination === 'UPLOAD') {
    if (pageStep === destination) return disabled('Bạn đang xem bước này.');
    return { enabled: true, path: `/projects/${projectId}`, reason: 'Mở thông tin dự án và phương tiện nguồn.' };
  }

  const access = resolveWorkflowRouteAccess(workflow, destination);
  if (!access.allowed) return disabled(access.reason ?? 'Bước này chưa sẵn sàng theo quy trình của dự án.');
  if (pageStep === destination) return disabled('Bạn đang xem bước này.');

  const language = access.targetLanguage;
  const query = destination !== 'TRANSCRIPT' && language ? `?language=${encodeURIComponent(language)}` : '';
  return {
    enabled: true,
    path: `/projects/${projectId}/${routeSegment[destination]}${query}`,
    reason: 'Mở bước này trong cùng dự án.',
  };
}
