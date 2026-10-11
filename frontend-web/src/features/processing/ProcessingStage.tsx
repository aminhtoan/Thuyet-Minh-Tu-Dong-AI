import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Spinner } from '../../components/common/Spinner';
import { clampProgress } from './processingUtils';
import type { ProcessingStage as Stage } from './types';
import { processingStatusLabels } from '../../localization/statusLabels.mjs';

export function ProcessingStage({ stage }: { stage: Stage }) {
  const active = stage.status === 'PROCESSING';
  return <li className={'processing-stage processing-stage--' + stage.status.toLowerCase()}>
    <span className="processing-stage__icon" aria-hidden={!active}>
      {active ? <Spinner label={'Đang xử lý ' + stage.title} /> : stage.status === 'COMPLETED' ? '✓' : stage.status === 'FAILED' ? '!' : stage.status === 'CANCELLED' ? '×' : '○'}
    </span>
    <div className="processing-stage__body">
      <div className="processing-stage__heading"><h3>{stage.title}</h3>
        <Badge variant={stage.status === 'COMPLETED' ? 'success' : stage.status === 'FAILED' ? 'error' : active ? 'info' : 'default'}>{processingStatusLabels[stage.status]}</Badge>
      </div>
      {stage.description && <p>{stage.description}</p>}
      {stage.progress !== undefined && <ProgressBar value={clampProgress(stage.progress)} label={stage.title} />}
    </div>
  </li>;
}
