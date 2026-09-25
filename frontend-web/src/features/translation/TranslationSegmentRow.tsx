import type { TranscriptSegment } from '../transcript/types';
import { formatTimestamp } from '../transcript/transcriptUtils';
import type { TranslationSegment } from './types';

type Props = {
  source: TranscriptSegment;
  translation?: TranslationSegment;
  error?: string;
  disabled: boolean;
  onChange: (id: string, text: string) => void;
};

export function TranslationSegmentRow({ source, translation, error, disabled, onChange }: Props) {
  const inputId = 'translation-' + source.id;
  return (
    <article className="translation-segment" aria-label={'Segment ' + source.sequence}>
      <div className="translation-segment__meta">
        <span>#{String(source.sequence).padStart(2, '0')}</span>
        <span>{formatTimestamp(source.startTime)} → {formatTimestamp(source.endTime)}</span>
      </div>
      <div className="translation-segment__columns">
        <div className="translation-original"><span className="translation-label">Original</span><p>{source.text}</p></div>
        <div className="translation-target">
          <label className="translation-label" htmlFor={translation ? inputId : undefined}>Translation</label>
          {translation ? <>
            <textarea id={inputId} aria-label={'Translation for segment ' + source.sequence}
              value={translation.translatedText} disabled={disabled} rows={3}
              aria-invalid={Boolean(error)} aria-describedby={error ? inputId + '-error' : undefined}
              onChange={(event) => onChange(translation.id, event.target.value)} />
            {error && <p id={inputId + '-error'} className="translation-error" role="alert">{error}</p>}
          </> : <p className="translation-placeholder">Translation will appear here.</p>}
        </div>
      </div>
    </article>
  );
}
