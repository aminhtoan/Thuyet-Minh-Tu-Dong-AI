import { Icon } from './Icon';
import '../../styles/workflow.css';

const steps = ['Tải lên', 'Bản ghi', 'Bản dịch', 'Giọng đọc', 'Tạo thuyết minh', 'Kết quả'];

export function WorkflowSteps({ current }: { current: 'transcript' | 'translation' | 'voice' | 'generate' | 'result' }) {
  const activeIndex = current === 'result' ? 5 : current === 'transcript' ? 1 : current === 'translation' ? 2 : current === 'voice' ? 3 : 4;
  return <ol className="workflow-steps" aria-label="Quy trình dự án">
    {steps.map((step, index) => <li key={step} aria-current={index === activeIndex ? 'step' : undefined} className={index < activeIndex ? 'workflow-steps__done' : index === activeIndex ? 'workflow-steps__current' : undefined}>
      <span className="workflow-steps__number">{index < activeIndex ? <Icon name="check" width="14" /> : index + 1}</span>{step}<span className="visually-hidden">{index < activeIndex ? ' hoàn tất' : ''}</span>
    </li>)}
  </ol>;
}
