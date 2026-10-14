import type { TranscriptSegment } from '../transcript/types';
import { formatPreciseTimestamp } from '../transcript/transcriptPresentation.mjs';
import type { TranslationSegment } from './types';

type Props = {
  source: TranscriptSegment;
  translation?: TranslationSegment;
  error?: string;
};

export function TranslationSegmentRow({ source, translation, error }: Props) {
  const inputId = 'translation-' + source.id;
  return (
    <article className="translation-segment" aria-label={'Đoạn ' + source.sequence}>
      <div className="translation-segment__meta">
        <span>#{String(source.sequence).padStart(2, '0')}</span>
        <span title="Phút:giây.mili giây">{formatPreciseTimestamp(source.startTime)} → {formatPreciseTimestamp(source.endTime)}</span>
      </div>
      <div className="translation-segment__columns">
        <div className="translation-original"><span className="translation-label">Bản gốc</span><p>{source.text}</p></div>
        <div className="translation-target">
          <span className="translation-label">Bản dịch</span>
          {translation ? <>
            <div id={inputId} className="translation-target__text" role="region" tabIndex={0}
              aria-label={'Bản dịch cho đoạn ' + source.sequence + ', chỉ đọc'}
              aria-describedby={error ? inputId + '-error' : undefined}>{translation.translatedText}</div>
            {error && <p id={inputId + '-error'} className="translation-error" role="alert">{error}</p>}
          </> : <p className="translation-placeholder">Chưa có bản dịch được xác minh cho phân đoạn này.</p>}
        </div>
      </div>
    </article>
  );
}
