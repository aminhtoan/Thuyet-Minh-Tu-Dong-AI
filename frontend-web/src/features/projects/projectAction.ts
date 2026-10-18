import { resolveWorkflowRouteAccess } from './workflowRouteGuard.ts';
import type { Project, ProjectWorkflow, WorkflowStep } from './types';

export type ProjectAction = {
  path: string
  label: string
  available: boolean
  step: 'upload' | 'transcript' | 'translation' | 'voice' | 'generate' | 'result' | 'unknown'
  reason?: string
}

const routeStep: Partial<Record<WorkflowStep, ProjectAction['step']>> = {
  UPLOAD: 'upload', TRANSCRIPT: 'transcript', TRANSLATION: 'translation', VOICE: 'voice', GENERATE: 'generate', RESULT: 'result',
};

function unavailable(projectId: string, reason: string): ProjectAction {
  return { path: `/projects/${projectId}`, label: 'Xem chi tiết', available: false, step: 'unknown', reason };
}

export function workflowStepForDisplay(workflow?: ProjectWorkflow): ProjectAction['step'] {
  return workflow ? routeStep[workflow.step] ?? 'unknown' : 'unknown';
}

export function projectAction(project: Project): ProjectAction {
  const workflow = project.workflow;
  if (!workflow) return unavailable(project.id, 'Chưa có thông tin quy trình đáng tin cậy.');
  const step = routeStep[workflow.step];
  if (!step || workflow.step === 'UNKNOWN' || workflow.state === 'BLOCKED') {
    return unavailable(project.id, 'Quy trình hiện chưa thể tiếp tục an toàn.');
  }
  if (workflow.step === 'UPLOAD' && (workflow.state !== 'READY' || !workflow.canResume)) {
    return unavailable(project.id, 'Dự án chưa sẵn sàng để tải phương tiện.');
  }
  let targetCode: string | null = null;
  if (workflow.step !== 'UPLOAD') {
    const access = resolveWorkflowRouteAccess(workflow, workflow.step);
    if (!access.allowed) return unavailable(project.id, access.reason ?? 'Quy trình hiện chưa thể tiếp tục an toàn.');
    targetCode = access.targetLanguage;
  }

  const suffix = targetCode ? `?language=${encodeURIComponent(targetCode)}` : '';
  const path = step === 'upload' ? `/projects/${project.id}` : `/projects/${project.id}/${step}${suffix}`;
  const label = workflow.state === 'FAILED' ? 'Mở bước gặp lỗi'
    : workflow.state === 'PROCESSING' ? 'Xem tiến trình'
      : step === 'result' ? 'Xem kết quả'
        : step === 'upload' ? 'Tiếp tục tải lên' : 'Tiếp tục';
  return { path, label, available: true, step };
}
