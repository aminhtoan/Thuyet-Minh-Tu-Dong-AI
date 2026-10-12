import { formatPreciseTimestamp } from './transcriptPresentation.mjs'
import type { TranscriptSegment } from './types'

type Props = { segment: TranscriptSegment; error?: string; onSeek?: (time: number) => void; canSeek?: boolean; active?: boolean }

export function TranscriptSegmentEditor({ segment, error, onSeek, canSeek, active }: Props) {
  const inputId = `transcript-segment-${segment.id}`
  return <div className={`transcript-segment${error ? ' transcript-segment--invalid' : ''}${active ? ' transcript-segment--active' : ''}`}>
    <div className="transcript-segment__header"><div className="transcript-segment__meta"><span>#{String(segment.sequence).padStart(2, '0')}</span><span title="Phút:giây.mili giây">{formatPreciseTimestamp(segment.startTime)} → {formatPreciseTimestamp(segment.endTime)}</span>{active && <span className="transcript-segment__playing">Đang phát</span>}</div>
    {onSeek && <button className="transcript-segment__seek" type="button" disabled={!canSeek} aria-label={`Phát phân đoạn ${segment.sequence} từ ${formatPreciseTimestamp(segment.startTime)}`} aria-current={active ? 'true' : undefined} onClick={() => onSeek(segment.startTime)}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="m8 5 11 7-11 7V5Z" /></svg><span>Phát từ {formatPreciseTimestamp(segment.startTime)}</span></button>}</div>
    <div id={inputId} className="transcript-segment__text" role="region" tabIndex={0} aria-label={`Nội dung phân đoạn ${segment.sequence}, chỉ đọc`} aria-describedby={error ? `${inputId}-error` : undefined}>{segment.text}</div>
    {error && <p id={`${inputId}-error`} className="transcript-segment__error" role="alert">{error}</p>}
  </div>
}
