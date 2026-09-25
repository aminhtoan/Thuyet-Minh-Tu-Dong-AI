import { formatTimestamp } from './transcriptUtils'
import type { TranscriptSegment } from './types'

type Props = { segment: TranscriptSegment; error?: string; disabled: boolean; onChange: (id: string, text: string) => void }

export function TranscriptSegmentEditor({ segment, error, disabled, onChange }: Props) {
  const inputId = `transcript-segment-${segment.id}`
  return <div className={`transcript-segment${error ? ' transcript-segment--invalid' : ''}`}>
    <div className="transcript-segment__meta"><span>#{String(segment.sequence).padStart(2, '0')}</span><span>{formatTimestamp(segment.startTime)} → {formatTimestamp(segment.endTime)}</span></div>
    <label htmlFor={inputId}>Segment {segment.sequence} text</label>
    <textarea id={inputId} value={segment.text} onChange={(event) => onChange(segment.id, event.target.value)} rows={3} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} />
    {error && <p id={`${inputId}-error`} className="transcript-segment__error" role="alert">{error}</p>}
  </div>
}
