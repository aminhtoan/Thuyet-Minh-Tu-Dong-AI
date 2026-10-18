import type { ProjectWorkflow, WorkflowJobType, WorkflowStep } from './types';
import { workflowStepLabels } from '../../localization/statusLabels.mjs';

export const workflowStepOrder: Exclude<WorkflowStep, 'UNKNOWN'>[] = ['UPLOAD', 'TRANSCRIPT', 'TRANSLATION', 'VOICE', 'GENERATE', 'RESULT'];

const jobStep: Record<WorkflowJobType, Exclude<WorkflowStep, 'UPLOAD' | 'RESULT' | 'UNKNOWN'>> = {
  TRANSCRIPTION: 'TRANSCRIPT',
  TRANSLATION: 'TRANSLATION',
  TTS: 'VOICE',
  VIDEO_PROCESSING: 'GENERATE',
};

export type WorkflowStepVisualState = 'completed' | 'current' | 'processing' | 'failed' | 'upcoming' | 'unknown';

export type WorkflowStepsPresentation = {
  activeIndex: number;
  trustworthy: boolean;
  state: ProjectWorkflow['state'] | 'UNKNOWN';
  message: string;
  steps: WorkflowStepVisualState[];
};

function hasTrustedCurrentStep(workflow: ProjectWorkflow | undefined): workflow is ProjectWorkflow & { step: Exclude<WorkflowStep, 'UNKNOWN'> } {
  if (!workflow || workflow.step === 'UNKNOWN' || workflow.state === 'BLOCKED') return false;
  if (workflow.state === 'PROCESSING') {
    return Boolean(workflow.processing && !workflow.failure && jobStep[workflow.processing.type] === workflow.step);
  }
  if (workflow.state === 'FAILED') {
    return Boolean(workflow.failure && !workflow.processing && jobStep[workflow.failure.type] === workflow.step);
  }
  if (workflow.processing || workflow.failure) return false;
  if (workflow.state !== 'COMPLETED') return true;
  if (workflow.step !== 'RESULT' || !workflow.mediaType) return false;
  return workflow.mediaType === 'AUDIO' ? workflow.artifact.narrationReady : workflow.artifact.resultReady;
}

export function workflowStepsPresentation(workflow: ProjectWorkflow | undefined): WorkflowStepsPresentation {
  if (!hasTrustedCurrentStep(workflow)) {
    return {
      activeIndex: -1,
      trustworthy: false,
      state: 'UNKNOWN',
      message: 'Máy chủ chưa cung cấp đủ bằng chứng để xác định bước hiện tại. Không có tác vụ nào được tự động bắt đầu.',
      steps: workflowStepOrder.map(() => 'unknown'),
    };
  }
  const activeIndex = workflowStepOrder.indexOf(workflow.step);
  const activeLabel = workflowStepLabels[activeIndex] ?? 'Không xác định';
  const activeState: WorkflowStepVisualState = workflow.state === 'PROCESSING'
    ? 'processing'
    : workflow.state === 'FAILED'
      ? 'failed'
      : workflow.state === 'COMPLETED'
        ? 'completed'
        : 'current';
  const message = workflow.state === 'PROCESSING'
    ? `Đang xử lý bước ${activeLabel}. Tiến độ chỉ được hiển thị khi máy chủ cung cấp.`
    : workflow.state === 'FAILED'
      ? `Bước ${activeLabel} gặp lỗi đã được máy chủ xác nhận.`
      : workflow.state === 'COMPLETED'
        ? 'Quy trình tạo thuyết minh đã hoàn thành.'
        : `Bước hiện tại: ${activeLabel}.`;
  return {
    activeIndex,
    trustworthy: true,
    state: workflow.state,
    message,
    steps: workflowStepOrder.map((_, index) => index < activeIndex ? 'completed' : index === activeIndex ? activeState : 'upcoming'),
  };
}
