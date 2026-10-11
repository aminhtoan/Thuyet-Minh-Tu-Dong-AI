import { Icon } from './Icon';
import { workflowStepLabels } from '../../localization/statusLabels.mjs';
import '../../styles/workflow.css';

export function WorkflowSteps({ current }: { current: 'transcript' | 'translation' | 'voice' | 'generate' | 'result' }) {
  const activeIndex = current === 'result' ? 5 : current === 'transcript' ? 1 : current === 'translation' ? 2 : current === 'voice' ? 3 : 4;
  return <ol className="workflow-steps" aria-label="Quy trình dự án">
    {workflowStepLabels.map((step, index) => <li key={step} aria-current={index === activeIndex ? 'step' : undefined} aria-disabled={index > activeIndex} className={index < activeIndex ? 'workflow-steps__done' : index === activeIndex ? 'workflow-steps__current' : undefined}>
      <span className="workflow-steps__number">{index < activeIndex ? <Icon name="check" width="14" /> : index + 1}</span>{step}<span className="visually-hidden">{index < activeIndex ? ' hoàn tất' : ''}</span>
    </li>)}
  </ol>;
}
