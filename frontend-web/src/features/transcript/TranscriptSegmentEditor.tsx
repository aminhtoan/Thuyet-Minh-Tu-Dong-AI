import { formatPreciseTimestamp } from './transcriptPresentation.mjs'
import { TRANSCRIPT_SEGMENT_MAX_LENGTH, validateTranscriptSegmentText } from './transcriptEditing.mjs'
import type { TranscriptSegment } from './types'

type Props = {
  segment: TranscriptSegment
  error?: string
  onSeek?: (time: number) => void
  canSeek?: boolean
  active?: boolean
  showEditControl?: boolean
  canEdit?: boolean
  editDisabledReason?: string | null
  editing?: boolean
  draftText?: string
  editError?: string | null
  saving?: boolean
  onEdit?: () => void
  onDraftChange?: (value: string) => void
  onSave?: () => void
  onCancel?: () => void
}

export function TranscriptSegmentEditor({ segment, error, onSeek, canSeek, active, showEditControl = false, canEdit = false, editDisabledReason, editing = false, draftText = '', editError, saving = false, onEdit, onDraftChange, onSave, onCancel }: Props) {
  const inputId = `transcript-segment-${segment.id}`
  const validation = validateTranscriptSegmentText(draftText, segment.text)
  const fieldError = editError || (editing && !validation.valid ? validation.error : null)
  return <div className={`transcript-segment${error || fieldError ? ' transcript-segment--invalid' : ''}${active ? ' transcript-segment--active' : ''}${editing ? ' transcript-segment--editing' : ''}`}>
    <div className="transcript-segment__header"><div className="transcript-segment__meta"><span>#{String(segment.sequence).padStart(2, '0')}</span><span title="Phút:giây.mili giây">{formatPreciseTimestamp(segment.startTime)} → {formatPreciseTimestamp(segment.endTime)}</span>{active && <span className="transcript-segment__playing">Đang phát</span>}</div>
    <div className="transcript-segment__controls">{onSeek && <button className="transcript-segment__seek" type="button" disabled={!canSeek} aria-label={`Phát phân đoạn ${segment.sequence} từ ${formatPreciseTimestamp(segment.startTime)}`} aria-current={active ? 'true' : undefined} onClick={() => onSeek(segment.startTime)}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="m8 5 11 7-11 7V5Z" /></svg><span>Phát từ {formatPreciseTimestamp(segment.startTime)}</span></button>}{showEditControl && !editing && <button id={`${inputId}-edit`} className="transcript-segment__edit" type="button" disabled={!canEdit} title={!canEdit ? editDisabledReason ?? undefined : undefined} aria-describedby={!canEdit && editDisabledReason ? `${inputId}-edit-reason` : undefined} onClick={onEdit}>Chỉnh sửa</button>}</div></div>
    {!editing && <div id={inputId} className="transcript-segment__text" role="region" tabIndex={0} aria-label={`Nội dung phân đoạn ${segment.sequence}, chỉ đọc`} aria-describedby={error ? `${inputId}-error` : undefined}>{segment.text}</div>}
    {editing && <div className="transcript-segment__editor" aria-busy={saving}><label htmlFor={`${inputId}-textarea`}>Nội dung phân đoạn {segment.sequence}</label><textarea autoFocus id={`${inputId}-textarea`} value={draftText} maxLength={TRANSCRIPT_SEGMENT_MAX_LENGTH} disabled={saving} aria-invalid={Boolean(fieldError)} aria-describedby={`${inputId}-counter ${inputId}-edit-status${fieldError ? ` ${inputId}-edit-error` : ''}`} onChange={(event) => onDraftChange?.(event.target.value)} /><div className="transcript-segment__editor-meta"><span id={`${inputId}-counter`}>{draftText.length}/{TRANSCRIPT_SEGMENT_MAX_LENGTH} ký tự</span>{fieldError && <span id={`${inputId}-edit-error`} className="transcript-segment__error" role="alert">{fieldError}</span>}</div><p id={`${inputId}-edit-status`} className="transcript-segment__edit-status" role="status" aria-atomic="true">{saving ? 'Đang lưu phân đoạn...' : draftText !== segment.text ? 'Đang chỉnh sửa · Nội dung chưa được lưu.' : 'Đang chỉnh sửa · Chưa có thay đổi.'}</p><div className="transcript-segment__editor-actions"><button className="button button--primary button--sm" type="button" disabled={saving || !validation.valid || !validation.changed} onClick={onSave}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button><button className="button button--secondary button--sm" type="button" disabled={saving} onClick={onCancel}>Hủy</button></div></div>}
    {showEditControl && !canEdit && editDisabledReason && !editing && <span id={`${inputId}-edit-reason`} className="sr-only">{editDisabledReason}</span>}
    {error && <p id={`${inputId}-error`} className="transcript-segment__error" role="alert">{error}</p>}
  </div>
}
