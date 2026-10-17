import { isLanguageCode } from './languages.ts';
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
const languageSteps = new Set<WorkflowStep>(['VOICE', 'GENERATE', 'RESULT']);
const trustedLanguageSources = new Set(['JOB', 'TRANSLATION', 'NARRATION', 'RESULT']);

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
  if (!step || workflow.step === 'UNKNOWN' || workflow.state === 'BLOCKED' || !workflow.canResume) {
    return unavailable(project.id, 'Quy trình hiện chưa thể tiếp tục an toàn.');
  }
  if (workflow.step === 'UPLOAD' && workflow.state !== 'READY') {
    return unavailable(project.id, 'Dự án chưa sẵn sàng để tải phương tiện.');
  }
  if (workflow.step === 'RESULT' && workflow.state !== 'COMPLETED') {
    return unavailable(project.id, 'Kết quả chưa được xác nhận hoàn tất.');
  }
  if (workflow.step !== 'UPLOAD' && workflow.step !== 'RESULT' && !['READY', 'PROCESSING', 'FAILED'].includes(workflow.state)) {
    return unavailable(project.id, 'Trạng thái quy trình không nhất quán.');
  }

  const target = workflow.targetLanguage;
  if (target && (!trustedLanguageSources.has(target.source) || !isLanguageCode(target.code))) {
    return unavailable(project.id, 'Ngôn ngữ đích chưa được màn hình hiện tại hỗ trợ.');
  }
  const requiresTarget = languageSteps.has(workflow.step)
    || (workflow.step === 'TRANSLATION' && (workflow.state === 'PROCESSING' || workflow.state === 'FAILED'));
  if (requiresTarget && !target) {
    return unavailable(project.id, 'Chưa xác định được ngôn ngữ đích từ dữ liệu quy trình.');
  }

  const suffix = target ? `?language=${encodeURIComponent(target.code)}` : '';
  const path = step === 'upload' ? `/projects/${project.id}` : `/projects/${project.id}/${step}${suffix}`;
  const label = workflow.state === 'FAILED' ? 'Mở bước gặp lỗi'
    : workflow.state === 'PROCESSING' ? 'Xem tiến trình'
      : step === 'result' ? 'Xem kết quả'
        : step === 'upload' ? 'Tiếp tục tải lên' : 'Tiếp tục';
  return { path, label, available: true, step };
}
