import '../../styles/workflow.css';

const steps = ['Upload', 'Transcript', 'Translation', 'Voice', 'Generate'];
export function WorkflowSteps({ current }: { current: 'transcript' | 'translation' | 'voice' | 'generate' }) {
  const activeIndex = current === 'transcript' ? 1 : current === 'translation' ? 2 : current === 'voice' ? 3 : 4;
  return <ol className="workflow-steps" aria-label="Project workflow">
    {steps.map((step, index) => <li key={step} aria-current={index === activeIndex ? 'step' : undefined}
      className={index < activeIndex ? 'workflow-steps__done' : index === activeIndex ? 'workflow-steps__current' : undefined}>{step}{index < activeIndex ? ' complete' : ''}</li>)}
  </ol>;
}
