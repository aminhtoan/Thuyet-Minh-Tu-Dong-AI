import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Spinner } from '../components/common/Spinner'
import { PageHeader } from '../components/layout/PageHeader'
import { formatFileSize } from '../features/projects/mediaUpload'
import { projectRepository } from '../features/projects/projectRepository'
import { languageNames } from '../features/projects/projectUtils'
import type { Project } from '../features/projects/types'
import { TranscriptSegmentEditor } from '../features/transcript/TranscriptSegmentEditor'
import { formatTimestamp } from '../features/transcript/transcriptUtils'
import { useTranscriptEditor } from '../features/transcript/useTranscriptEditor'
import { WorkflowSteps } from '../components/common/WorkflowSteps'
import '../styles/transcript.css'

export function TranscriptPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const project = projectId ? projectRepository.getById(projectId) : undefined
  if (!project || !projectId) return <><PageHeader title="Bản ghi" description="Kiểm tra nội dung lời nói trong dự án." /><Card padding="lg"><ErrorState title="Không tìm thấy dự án" description="Dự án này không có trong dữ liệu mô phỏng hiện tại." /><Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link></Card></>
  return <TranscriptWorkspace key={projectId} project={project} />
}

function TranscriptWorkspace({ project }: { project: Project }) {
  const editor = useTranscriptEditor(project.id)
  const navigate = useNavigate()
  const canContinue = Boolean(editor.draft && !editor.dirty && !editor.hasInvalidSegments && (editor.status === 'SAVED' || editor.status === 'READY'))
  const isBusy = editor.status === 'LOADING' || editor.status === 'GENERATING' || editor.status === 'SAVING'
  const stage = editor.status === 'GENERATING' ? 'TRANSCRIBING' : editor.draft ? 'TRANSCRIBED' : project.status
  const canGenerate = project.status !== 'DRAFT'
  const retry = editor.failedAction === 'load' ? editor.retryLoad : editor.failedAction === 'save' ? editor.saveTranscript : editor.generate

  return <>
    <PageHeader title="Bản ghi" description="Kiểm tra và chỉnh sửa từng phân đoạn có mốc thời gian trước khi dịch." actions={<Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link>} />
    <div className="transcript-intro"><div><span className="transcript-eyebrow">KHÔNG GIAN DỰ ÁN</span><h2>{project.name}</h2><p>Ngôn ngữ nguồn: {languageNames[project.sourceLanguage]} · Việc tạo bản ghi đang được mô phỏng.</p></div><Badge variant={stage === 'TRANSCRIBED' ? 'success' : 'info'}>{stage}</Badge></div>
    <WorkflowSteps current="transcript" />
    <div className="transcript-layout">
      <Card padding="lg" className="transcript-media"><h2>Phương tiện nguồn</h2><div className="transcript-media__icon" aria-hidden="true">{project.mediaType === 'VIDEO' ? '▶' : '♫'}</div><strong>{project.mediaName ?? 'Tham chiếu phương tiện mô phỏng'}</strong><p>{project.mediaType === 'VIDEO' ? 'Video' : 'Âm thanh'} · {languageNames[project.sourceLanguage]}{project.mediaSize ? ` · ${formatFileSize(project.mediaSize)}` : ''}{project.durationSeconds ? ` · ${formatTimestamp(project.durationSeconds)}` : ''}</p><div className="transcript-media__note">Bản xem trước không khả dụng vì lượt tải lên mô phỏng ở S5 không lưu tệp có thể phát.</div></Card>
      <Card padding="lg" className="transcript-editor"><div className="transcript-editor__heading"><div><h2>Các phân đoạn bản ghi</h2><p>{editor.draft ? `${editor.draft.segments.length} phân đoạn có mốc thời gian` : 'Tạo bản ghi mẫu để bắt đầu kiểm tra.'}</p></div><Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{editor.status.replace('_', ' ')}</Badge></div>
        {editor.status === 'LOADING' && <div className="transcript-centered" role="status"><Spinner size="lg" label="Đang tải bản ghi" /><p>Đang tải bản ghi...</p></div>}
        {editor.status === 'GENERATING' && <div className="transcript-centered" role="status"><Spinner size="lg" label="Đang tạo bản ghi mô phỏng" /><h3>Đang tạo bản ghi...</h3><p>Đang chuẩn bị các phân đoạn mẫu. Không gọi nhà cung cấp chuyển giọng nói thành văn bản.</p></div>}
        {editor.status === 'NOT_STARTED' && <EmptyState title="Chưa có bản ghi" description={canGenerate ? 'Phương tiện đã sẵn sàng để tạo bản ghi mẫu.' : 'Hãy tải phương tiện lên trước khi tạo bản ghi.'} action={canGenerate ? <Button onClick={editor.generate}>Tạo bản ghi</Button> : undefined} />}
        {editor.status === 'FAILED' && <ErrorState title={editor.failedAction === 'save' ? 'Không thể lưu bản ghi' : editor.failedAction === 'load' ? 'Không thể tải bản ghi' : 'Không thể tạo bản ghi'} description={editor.error ?? 'Vui lòng thử lại.'} onRetry={retry} retryLabel="Thử lại" />}
        {editor.draft && editor.draft.segments.length > 0 && editor.status !== 'LOADING' && editor.status !== 'GENERATING' && <div className="transcript-segment-list" aria-label="Các phân đoạn bản ghi">{editor.draft.segments.map((segment) => <TranscriptSegmentEditor key={segment.id} segment={segment} error={editor.segmentErrors[segment.id]} disabled={isBusy} onChange={editor.updateSegment} />)}</div>}
        {editor.draft && editor.draft.segments.length === 0 && <EmptyState title="Không có phân đoạn bản ghi" description="Tạo bản ghi mẫu mới để bắt đầu." action={<Button onClick={editor.generate}>Tạo bản ghi</Button>} />}
        {editor.draft && <div className="transcript-actions"><div className="transcript-actions__status" role="status">{editor.status === 'SAVING' ? 'Đang lưu bản ghi...' : editor.dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu trong phiên phát triển này'}{editor.hasInvalidSegments && <span className="transcript-actions__error">Hãy bổ sung các phân đoạn còn trống trước khi lưu.</span>}</div><div className="transcript-actions__buttons"><Button variant="secondary" disabled={!editor.canReset} onClick={editor.resetChanges}>Đặt lại thay đổi</Button><Button loading={editor.status === 'SAVING'} disabled={!editor.canSave} onClick={editor.saveTranscript}>Lưu bản ghi</Button></div><div className="transcript-actions__next"><Button variant="secondary" disabled={!canContinue} onClick={() => navigate(`/projects/${project.id}/translation`)}>Tiếp tục đến bản dịch</Button><span>{canContinue ? 'Bản ghi đã lưu sẵn sàng để dịch.' : 'Hãy lưu mọi thay đổi trước khi tiếp tục đến Bản dịch.'}</span></div></div>}
      </Card>
    </div>
  </>
}
