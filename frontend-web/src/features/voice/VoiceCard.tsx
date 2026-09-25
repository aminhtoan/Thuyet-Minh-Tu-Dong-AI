import { Button } from '../../components/common/Button';
import { languageNames } from '../projects/projectUtils';
import type { Voice } from './types';

type Props = { voice: Voice; selected: boolean; previewing: boolean; disabled: boolean; onSelect: () => void; onPreview: () => void };
export function VoiceCard({ voice, selected, previewing, disabled, onSelect, onPreview }: Props) {
  return <article className={'voice-card' + (selected ? ' voice-card--selected' : '')} aria-label={voice.name + ' voice'}>
    <div className="voice-card__heading"><h3>{voice.name}</h3>{selected && <span className="voice-selected">✓ Selected</span>}</div>
    <p className="voice-meta">{voice.gender} · {languageNames[voice.languageCode]}</p>
    <p className="voice-description">{voice.description}</p>
    <p className="voice-preview-status" role="status">{previewing ? 'Preview simulation running... No audio is played.' : 'Demo voice · simulated preview'}</p>
    <div className="voice-card__actions">
      <Button variant="secondary" disabled={disabled} aria-label={(previewing ? 'Stop preview of ' : 'Preview ') + voice.name + ' voice'} onClick={onPreview}>{previewing ? 'Stop Preview' : 'Preview'}</Button>
      <Button variant={selected ? 'primary' : 'secondary'} disabled={disabled} aria-pressed={selected} aria-label={'Select ' + voice.name + ' voice'} onClick={onSelect}>{selected ? 'Selected' : 'Select'}</Button>
    </div>
  </article>;
}
