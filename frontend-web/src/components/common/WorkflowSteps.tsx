import { useId, type CSSProperties, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import type { ProjectWorkflow } from '../../features/projects/types';
import { resolveWorkflowStepNavigation, type WorkflowPageStep } from '../../features/projects/workflowStepNavigation';
import { workflowStepOrder, workflowStepsPresentation, type WorkflowStepVisualState } from '../../features/projects/workflowStepsPresentation';
import { workflowStepLabels } from '../../localization/statusLabels.mjs';
import '../../styles/workflow.css';

const visualStateLabels: Record<WorkflowStepVisualState, string> = {
  completed: 'Hoàn tất',
  current: 'Hiện tại',
  processing: 'Đang xử lý',
  failed: 'Gặp lỗi',
  upcoming: 'Sắp tới',
  unknown: 'Chưa xác định',
};

type WorkflowStepsProps = {
  workflow?: ProjectWorkflow
  projectId: string
  pageStep: WorkflowPageStep
};

function activateLinkWithSpace(event: KeyboardEvent<HTMLAnchorElement>) {
  if (event.key !== ' ') return;
  event.preventDefault();
  event.currentTarget.click();
}

export function WorkflowSteps({ workflow, projectId, pageStep }: WorkflowStepsProps) {
  const titleId = useId();
  const presentation = workflowStepsPresentation(workflow);
  const progress = presentation.activeIndex < 0 ? 0 : presentation.activeIndex / (workflowStepOrder.length - 1) * 100;
  const style = { '--workflow-step-progress': `${progress}%` } as CSSProperties;
  return <section className={`workflow-stepper workflow-stepper--${presentation.state.toLowerCase()}`} aria-labelledby={titleId}>
    <header className="workflow-stepper__header">
      <div><h3 id={titleId}>Quy trình tạo thuyết minh</h3><p role={presentation.state === 'FAILED' ? 'alert' : 'status'}>{presentation.message}</p></div>
      {presentation.trustworthy && <span className="workflow-stepper__counter">Bước {presentation.activeIndex + 1} / {workflowStepOrder.length}</span>}
    </header>
    <div className="workflow-stepper__viewport" role="region" aria-label="Sáu bước của quy trình" tabIndex={0}>
      <div className="workflow-stepper__canvas" style={style}>
        <span className="workflow-stepper__track" aria-hidden="true"><span /></span>
        <ol className="workflow-steps">
          {workflowStepLabels.map((label, index) => {
            const visualState = presentation.steps[index] ?? 'unknown';
            const isCurrent = presentation.trustworthy && index === presentation.activeIndex;
            const destination = workflowStepOrder[index]!;
            const navigation = resolveWorkflowStepNavigation(workflow, projectId, destination, pageStep);
            const accessibleLabel = `${label}: ${visualStateLabels[visualState]}. ${navigation.reason}`;
            const content = <>
              <span className="workflow-step__marker" aria-hidden="true">{visualState === 'completed' ? <Icon name="check" width="17" /> : visualState === 'failed' ? <Icon name="alert" width="17" /> : index + 1}</span>
              <span className="workflow-step__label">{label}</span>
              <span className="workflow-step__state">{visualStateLabels[visualState]}</span>
            </>;
            return <li key={label} className={`workflow-step workflow-step--${visualState} ${navigation.enabled ? 'workflow-step--clickable' : 'workflow-step--disabled'}`}>
              {navigation.enabled && navigation.path
                ? <Link className="workflow-step__control" to={navigation.path} aria-current={isCurrent ? 'step' : undefined} aria-label={accessibleLabel} title={navigation.reason} onKeyDown={activateLinkWithSpace}>{content}</Link>
                : <span className="workflow-step__control" aria-current={isCurrent ? 'step' : undefined} aria-disabled="true" aria-label={accessibleLabel} title={navigation.reason}>{content}</span>}
            </li>;
          })}
        </ol>
      </div>
    </div>
  </section>;
}
