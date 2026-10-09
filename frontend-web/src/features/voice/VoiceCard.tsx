import { Button } from '../../components/common/Button';
import { languageNames } from '../projects/projectUtils';
import type { Voice } from './types';

type Props = { voice: Voice; selected: boolean; previewing: boolean; disabled: boolean; onSelect: () => void; onPreview: () => void };
export function VoiceCard({ voice, selected, previewing, disabled, onSelect, onPreview }: Props) {
  return <article className={'voice-card' + (selected ? ' voice-card--selected' : '')} aria-label={voice.name + ' voice'}>
    <div className="voice-card__heading"><h3>{voice.name}</h3>{selected && <span className="voice-selected">✓ Đã chọn</span>}</div>
    <p className="voice-meta">{voice.gender === 'Female' ? 'Nữ' : voice.gender === 'Male' ? 'Nam' : 'Trung tính'} · {languageNames[voice.languageCode] ?? voice.languageCode.toUpperCase()}</p>
    <p className="voice-description">{voice.description}</p>
    <p className="voice-preview-status" role="status">{voice.previewUrl ? (previewing ? 'Đang phát bản nghe thử.' : 'Có bản nghe thử') : 'Nhà cung cấp chưa có bản nghe thử.'}</p>
    <div className="voice-card__actions">
      <Button variant="secondary" disabled={disabled || !voice.previewUrl} aria-label={'Nghe thử giọng ' + voice.name} onClick={onPreview}>{previewing ? 'Dừng nghe' : 'Nghe thử'}</Button>
      <Button variant={selected ? 'primary' : 'secondary'} disabled={disabled} aria-pressed={selected} aria-label={'Chọn giọng ' + voice.name} onClick={onSelect}>{selected ? 'Đã chọn' : 'Chọn'}</Button>
    </div>
  </article>;
}
