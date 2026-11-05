import { Link, useNavigate, useParams } from 'react-router-dom'
import { useRef, useState } from 'react'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Spinner } from '../components/common/Spinner'
import { PageHeader } from '../components/layout/PageHeader'
import { formatFileSize } from '../features/projects/mediaUpload'
import { useProject } from '../features/projects/useProjects'
import { projectMetadataState } from '../features/projects/projectDataState'
import { canReviewUnconfirmedSource, sourceLanguageLabel, sourceState } from '../features/projects/sourceLanguage'
import { SourceLanguageSummary } from '../features/projects/SourceLanguageSummary'
import { SourceLanguageConfirmation } from '../features/transcript/SourceLanguageConfirmation'
import type { Project } from '../features/projects/types'
import { TranscriptSegmentEditor } from '../features/transcript/TranscriptSegmentEditor'
import { formatTimestamp } from '../features/transcript/transcriptUtils'
import { useTranscriptEditor } from '../features/transcript/useTranscriptEditor'
import { groupTranscriptSegments } from '../features/transcript/transcriptPresentation.mjs'
import { SourceMediaPlayer } from '../features/transcript/SourceMediaPlayer'
import { activeTranscriptSegment, seekSourceMedia } from '../features/transcript/sourcePlayback.mjs'
import { WorkflowSteps } from '../components/common/WorkflowSteps'
import { WorkflowRouteRecovery } from '../components/common/WorkflowRouteGuard'
import { resolveWorkflowRouteAccess } from '../features/projects/workflowRouteGuard'
import { transcriptSegmentEditingEnabled } from '../config/transcriptEditing'
import { hasConfirmedDownstreamArtifact, transcriptEditAccess, validateTranscriptSegmentText } from '../features/transcript/transcriptEditing.mjs'
import { transcriptService } from '../features/transcript/transcriptService'
import type { TranscriptSegment } from '../features/transcript/types'
import { ApiError } from '../lib/api'
import { projectStatusLabels, transcriptStatusLabels } from '../localization/statusLabels.mjs'
import '../styles/transcript.css'

export function TranscriptPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project, isLoading, error, reload } = useProject(projectId)
  if (isLoading) return <Card padding="lg"><Spinner label="Đang tải dự án" /></Card>
  if (error) return <Card padding="lg"><ErrorState title="Không thể tải dự án" description={error} /></Card>
  if (!project || !projectId) return <><PageHeader title="Bản ghi" description="Kiểm tra nội dung lời nói trong dự án." /><Card padding="lg"><ErrorState title="Không tìm thấy dự án" description="Dự án không tồn tại hoặc bạn không có quyền truy cập." /><Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link></Card></>
  const access = resolveWorkflowRouteAccess(project.workflow, 'TRANSCRIPT')
  if (!access.allowed && !canReviewUnconfirmedSource(project)) return <><PageHeader title="Bản ghi" description="Kiểm tra nội dung lời nói trong dự án." /><WorkflowRouteRecovery projectId={project.id} access={access} /></>
  return <TranscriptWorkspace key={projectId} project={project} canMutate={access.canMutate} onProjectReload={reload} />
}

type SegmentEditState = { segmentId: string; originalText: string; draftText: string; error: string | null; saving: boolean; conflict: boolean }

function TranscriptWorkspace({ project, canMutate, onProjectReload }: { project: Project; canMutate: boolean; onProjectReload: () => void | Promise<void> }) {
  const editor = useTranscriptEditor(project.id)
  const playerRef = useRef<HTMLMediaElement | null>(null)
  const [mediaReady, setMediaReady] = useState(false)
  const [mediaTime, setMediaTime] = useState(Number.NaN)
  const [seekError, setSeekError] = useState<string | null>(null)
  const [segmentEdit, setSegmentEdit] = useState<SegmentEditState | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<{ saved: boolean; downstream: boolean } | null>(null)
  const [sourceConfirmedFeedback, setSourceConfirmedFeedback] = useState(false)
  const saveLockRef = useRef(false)
  let displaySegments = editor.draft?.segments ?? []
  let groupingError: string | null = null
  if (!transcriptSegmentEditingEnabled) {
    try { displaySegments = groupTranscriptSegments(displaySegments) } catch (error) { groupingError = error instanceof Error ? error.message : 'Không thể hiển thị phân đoạn bản ghi.' }
  }
  const activeSegment = activeTranscriptSegment(displaySegments, mediaTime)
  async function seek(time: number) {
    setSeekError(null)
    try { if (!await seekSourceMedia(playerRef.current, time)) setSeekError('Phương tiện chưa sẵn sàng hoặc mốc thời gian nằm ngoài thời lượng tệp.') }
    catch { setSeekError('Không thể tự phát. Vui lòng nhấn nút Phát trên trình phát phương tiện.') }
  }
  const navigate = useNavigate()
  const source = sourceState(project)
  const sourceConfirmed = source.confirmed && Boolean(editor.draft?.languageCode) && editor.draft?.languageCode === source.language && editor.draft?.sourceLanguageStatus !== 'NEEDS_CONFIRMATION'
  const canContinue = Boolean(sourceConfirmed && editor.draft && !editor.hasInvalidSegments && editor.status === 'SAVED')
  const stage = editor.status === 'GENERATING' ? 'TRANSCRIBING' : editor.draft ? 'TRANSCRIBED' : project.status
  const canGenerate = canMutate
  const mediaState = projectMetadataState(project).media
  const mediaIdentity = `${project.id}:${mediaState}:${project.mediaType ?? 'unknown'}:${project.mediaName ?? 'unknown'}:${project.mediaSize ?? 'unknown'}`
  const retry = editor.failedAction === 'load' ? editor.retryLoad : canMutate ? editor.failedAction === 'save' ? editor.saveTranscript : generateTranscript : undefined

  async function generateTranscript() {
    await editor.generate()
    await onProjectReload()
  }

  function returnFocus(segmentId: string) {
    requestAnimationFrame(() => document.getElementById(`transcript-segment-${segmentId}-edit`)?.focus())
  }

  function beginSegmentEdit(segment: TranscriptSegment) {
    const access = transcriptEditAccess(transcriptSegmentEditingEnabled, project.workflow, editor.draft?.revision ?? null, Boolean(segment.backendSegmentId))
    if (!access.allowed) return
    setSaveFeedback(null)
    setSegmentEdit({ segmentId: segment.id, originalText: segment.text, draftText: segment.text, error: null, saving: false, conflict: false })
  }

  function cancelSegmentEdit() {
    if (!segmentEdit || segmentEdit.saving) return
    const segmentId = segmentEdit.segmentId
    setSegmentEdit(null)
    returnFocus(segmentId)
  }

  async function saveSegment(segment: TranscriptSegment) {
    if (!segmentEdit || segmentEdit.segmentId !== segment.id || saveLockRef.current) return
    const validation = validateTranscriptSegmentText(segmentEdit.draftText, segmentEdit.originalText)
    const access = transcriptEditAccess(transcriptSegmentEditingEnabled, project.workflow, editor.draft?.revision ?? null, Boolean(segment.backendSegmentId))
    if (!validation.valid || !validation.changed || !access.allowed || !segment.backendSegmentId || !editor.draft?.revision) {
      setSegmentEdit((value) => value ? { ...value, error: validation.error ?? access.reason ?? 'Không thể chỉnh sửa phân đoạn này.' } : value)
      return
    }
    saveLockRef.current = true
    setSegmentEdit((value) => value ? { ...value, saving: true, error: null, conflict: false } : value)
    const downstreamConfirmed = hasConfirmedDownstreamArtifact(project.workflow)
    try {
      const update = await transcriptService.updateSegment(project.id, segment.backendSegmentId, validation.text, editor.draft.revision)
      editor.applySegmentUpdate(update)
      setSegmentEdit(null)
      setSaveFeedback({ saved: true, downstream: downstreamConfirmed && update.downstream.requiresRevalidation })
      returnFocus(segment.id)
      editor.refreshTranscript()
      void onProjectReload()
    } catch (cause) {
      const conflict = cause instanceof ApiError && cause.status === 409 && cause.code === 'TRANSCRIPT_REVISION_CONFLICT'
      const message = conflict
        ? 'Bản ghi đã được thay đổi ở một phiên khác. Nội dung bạn nhập vẫn được giữ; hãy tải lại dữ liệu trước khi chỉnh sửa tiếp.'
        : cause instanceof ApiError && [401, 403, 404].includes(cause.status)
          ? 'Không thể lưu vì phiên đăng nhập hoặc quyền truy cập dự án đã thay đổi.'
          : cause instanceof Error ? cause.message : 'Không thể lưu thay đổi. Vui lòng thử lại.'
      setSegmentEdit((value) => value ? { ...value, saving: false, error: message, conflict } : value)
    } finally {
      saveLockRef.current = false
    }
  }

  function reloadAfterConflict() {
    if (!segmentEdit || segmentEdit.saving) return
    setSegmentEdit(null)
    setSaveFeedback(null)
    editor.retryLoad()
    void onProjectReload()
  }

  return <>
    <div className="transcript-page-heading"><PageHeader title="Bản ghi" description={`${project.name} · Ngôn ngữ nguồn: ${sourceLanguageLabel(source.language)}`} actions={<div className="transcript-page-heading__actions"><Badge variant={stage === 'TRANSCRIBED' ? 'success' : stage === 'FAILED' ? 'error' : 'info'}>{projectStatusLabels[stage]}</Badge><Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link></div>} /></div>
    <WorkflowSteps workflow={project.workflow} projectId={project.id} pageStep="TRANSCRIPT" />
    <SourceLanguageSummary project={project} />
    {sourceConfirmedFeedback && sourceConfirmed && <p role="status">Đã xác nhận ngôn ngữ nguồn và tải lại bản ghi.</p>}
    {editor.draft && (source.status === 'NEEDS_CONFIRMATION' || editor.draft.sourceLanguageStatus === 'NEEDS_CONFIRMATION') && <SourceLanguageConfirmation key={project.id} project={project} transcript={editor.draft} disabled={Boolean(segmentEdit) || editor.status !== 'SAVED'} onConfirmed={value => { editor.acceptConfirmedTranscript(value); setSourceConfirmedFeedback(value.sourceLanguageStatus === 'CONFIRMED') }} onProjectReload={onProjectReload} />}
    <div className="transcript-layout">
      <Card padding="lg" className="transcript-media"><h2>Phương tiện nguồn</h2><SourceMediaPlayer key={mediaIdentity} projectId={project.id} mediaType={project.mediaType} mediaSize={project.mediaSize} metadataState={mediaState} playerRef={playerRef} onTimeChange={setMediaTime} onReadyChange={setMediaReady} framedVideo /><strong>{mediaState === 'READY' ? project.mediaName : mediaState === 'EMPTY' ? 'Chưa có phương tiện' : 'Thông tin phương tiện chưa được xác minh'}</strong><p>{project.mediaType === 'VIDEO' ? 'Video' : project.mediaType === 'AUDIO' ? 'Âm thanh' : 'Chưa xác định'} · {sourceLanguageLabel(source.language)}{project.mediaSize ? ` · ${formatFileSize(project.mediaSize)}` : ''}{project.durationSeconds ? ` · ${formatTimestamp(project.durationSeconds)}` : ''}</p>{seekError && <p role="alert">{seekError}</p>}</Card>
      <Card padding="lg" className="transcript-editor"><div className="transcript-editor__heading"><div><h2>Các phân đoạn</h2>{!editor.draft && <p>Tạo bản ghi để bắt đầu kiểm tra.</p>}</div><Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{transcriptStatusLabels[editor.status]}</Badge></div>
        {editor.status === 'LOADING' && <div className="transcript-centered" role="status"><Spinner size="lg" label="Đang tải bản ghi" /><p>Đang tải bản ghi...</p></div>}
        {editor.status === 'GENERATING' && <div className="transcript-centered" role="status"><Spinner size="lg" label="Đang tạo bản ghi" /><h3>Đang chuyển giọng nói thành văn bản...</h3><p>Vui lòng giữ trang mở trong khi máy chủ xử lý tệp phương tiện.</p></div>}
        {editor.status === 'NOT_STARTED' && <EmptyState title="Chưa có bản ghi" description={canGenerate ? 'Phương tiện đã sẵn sàng để tạo bản ghi bằng dịch vụ nhận dạng giọng nói.' : 'Hãy tải phương tiện lên trước khi tạo bản ghi.'} action={canGenerate ? <Button onClick={() => void generateTranscript()}>Tạo bản ghi</Button> : undefined} />}
        {editor.status === 'FAILED' && <ErrorState title={editor.failedAction === 'save' ? 'Không thể lưu bản ghi' : editor.failedAction === 'load' ? 'Không thể tải bản ghi' : 'Không thể tạo bản ghi'} description={editor.error ?? 'Vui lòng thử lại.'} onRetry={retry} retryLabel="Thử lại" />}
        {groupingError && <ErrorState title="Không thể hiển thị mốc thời gian" description={groupingError} onRetry={editor.retryLoad} />}
        {saveFeedback?.saved && <div className="transcript-edit-feedback" role="status"><strong>Đã lưu thay đổi.</strong>{saveFeedback.downstream && <span>Bản ghi đã thay đổi. Bản dịch và kết quả liên quan cần được xác minh lại.</span>}</div>}
        {editor.draft && !groupingError && displaySegments.length > 0 && editor.status !== 'LOADING' && editor.status !== 'GENERATING' && <div className="transcript-segment-list" aria-label="Các phân đoạn bản ghi">{displaySegments.map((segment) => {
          const editAccess = transcriptEditAccess(transcriptSegmentEditingEnabled, project.workflow, editor.draft?.revision ?? null, Boolean(segment.backendSegmentId))
          const editing = segmentEdit?.segmentId === segment.id
          return <TranscriptSegmentEditor key={segment.id} segment={segment} error={editor.segmentErrors[segment.id]} onSeek={(time) => void seek(time)} canSeek={mediaReady} active={activeSegment === segment.id} showEditControl={transcriptSegmentEditingEnabled} canEdit={editAccess.allowed && !segmentEdit} editDisabledReason={segmentEdit && !editing ? 'Hãy lưu hoặc hủy phân đoạn đang chỉnh sửa trước.' : editAccess.reason} editing={editing} draftText={editing ? segmentEdit.draftText : ''} editError={editing ? segmentEdit.error : null} saving={editing && segmentEdit.saving} onEdit={() => beginSegmentEdit(segment)} onDraftChange={(value) => setSegmentEdit((current) => current?.segmentId === segment.id ? { ...current, draftText: value, error: null, conflict: false } : current)} onSave={() => void saveSegment(segment)} onCancel={cancelSegmentEdit} />
        })}</div>}
        {segmentEdit?.conflict && <div className="transcript-edit-conflict" role="alert"><p>{segmentEdit.error}</p><Button variant="secondary" onClick={reloadAfterConflict}>Tải lại dữ liệu</Button></div>}
        {editor.draft && editor.draft.segments.length === 0 && <EmptyState title="Không có phân đoạn bản ghi" description="Thử tạo lại bản ghi từ phương tiện nguồn." action={canMutate ? <Button onClick={() => void generateTranscript()}>Tạo lại bản ghi</Button> : undefined} />}
        {editor.draft && <div className="transcript-actions"><div className="transcript-actions__next"><Button variant="primary" disabled={!canContinue} onClick={() => navigate(`/projects/${project.id}/translation`)}>Tiếp tục đến bản dịch</Button><span>{canContinue ? 'Bản ghi sẵn sàng để dịch.' : 'Bản ghi chưa sẵn sàng.'}</span></div></div>}
      </Card>
    </div>
  </>
}
