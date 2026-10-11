import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Spinner } from '../components/common/Spinner'
import { PageHeader } from '../components/layout/PageHeader'
import { formatFileSize } from '../features/projects/mediaUpload'
import { useProject } from '../features/projects/useProjects'
import { languageNames } from '../features/projects/projectUtils'
import type { Project } from '../features/projects/types'
import { TranscriptSegmentEditor } from '../features/transcript/TranscriptSegmentEditor'
import { formatTimestamp } from '../features/transcript/transcriptUtils'
import { useTranscriptEditor } from '../features/transcript/useTranscriptEditor'
import { WorkflowSteps } from '../components/common/WorkflowSteps'
import { projectStatusLabels, transcriptStatusLabels } from '../localization/statusLabels.mjs'
import '../styles/transcript.css'

export function TranscriptPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project, isLoading, error } = useProject(projectId)
  if (isLoading) return <Card padding="lg"><Spinner label="Đang tải dự án" /></Card>
  if (error) return <Card padding="lg"><ErrorState title="Không thể tải dự án" description={error} /></Card>
  if (!project || !projectId) return <><PageHeader title="Bản ghi" description="Kiểm tra nội dung lời nói trong dự án." /><Card padding="lg"><ErrorState title="Không tìm thấy dự án" description="Dự án không tồn tại hoặc bạn không có quyền truy cập." /><Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link></Card></>
  return <TranscriptWorkspace key={projectId} project={project} />
}

function TranscriptWorkspace({ project }: { project: Project }) {
  const editor = useTranscriptEditor(project.id)
  const navigate = useNavigate()
  const canContinue = Boolean(editor.draft && !editor.hasInvalidSegments && editor.status === 'SAVED')
  const stage = editor.status === 'GENERATING' ? 'TRANSCRIBING' : editor.draft ? 'TRANSCRIBED' : project.status
  const canGenerate = project.status !== 'DRAFT'
  const retry = editor.failedAction === 'load' ? editor.retryLoad : editor.failedAction === 'save' ? editor.saveTranscript : editor.generate

  return <>
    <PageHeader title="Bản ghi" description="Xem từng phân đoạn có mốc thời gian trước khi dịch." actions={<Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link>} />
    <div className="transcript-intro"><div><span className="transcript-eyebrow">KHÔNG GIAN DỰ ÁN</span><h2>{project.name}</h2><p>Ngôn ngữ nguồn: {languageNames[project.sourceLanguage] ?? project.sourceLanguage.toUpperCase()} · Bản ghi được lưu trên máy chủ.</p></div><Badge variant={stage === 'TRANSCRIBED' ? 'success' : stage === 'FAILED' ? 'error' : 'info'}>{projectStatusLabels[stage]}</Badge></div>
    <WorkflowSteps current="transcript" />
    <div className="transcript-layout">
      <Card padding="lg" className="transcript-media"><h2>Phương tiện nguồn</h2><div className="transcript-media__icon" aria-hidden="true">{project.mediaType === 'VIDEO' ? '▶' : '♫'}</div><strong>{project.mediaName ?? 'Chưa có phương tiện'}</strong><p>{project.mediaType === 'VIDEO' ? 'Video' : 'Âm thanh'} · {languageNames[project.sourceLanguage] ?? project.sourceLanguage.toUpperCase()}{project.mediaSize ? ` · ${formatFileSize(project.mediaSize)}` : ''}{project.durationSeconds ? ` · ${formatTimestamp(project.durationSeconds)}` : ''}</p><div className="transcript-media__note">Máy chủ chưa cung cấp chức năng phát phương tiện nguồn.</div></Card>
      <Card padding="lg" className="transcript-editor"><div className="transcript-editor__heading"><div><h2>Các phân đoạn bản ghi</h2><p>{editor.draft ? `${editor.draft.segments.length} phân đoạn có mốc thời gian` : 'Tạo bản ghi để bắt đầu kiểm tra.'}</p></div><Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{transcriptStatusLabels[editor.status]}</Badge></div>
        {editor.status === 'LOADING' && <div className="transcript-centered" role="status"><Spinner size="lg" label="Đang tải bản ghi" /><p>Đang tải bản ghi...</p></div>}
        {editor.status === 'GENERATING' && <div className="transcript-centered" role="status"><Spinner size="lg" label="Đang tạo bản ghi" /><h3>Đang chuyển giọng nói thành văn bản...</h3><p>Vui lòng giữ trang mở trong khi máy chủ xử lý tệp phương tiện.</p></div>}
        {editor.status === 'NOT_STARTED' && <EmptyState title="Chưa có bản ghi" description={canGenerate ? 'Phương tiện đã sẵn sàng để tạo bản ghi bằng dịch vụ nhận dạng giọng nói.' : 'Hãy tải phương tiện lên trước khi tạo bản ghi.'} action={canGenerate ? <Button onClick={editor.generate}>Tạo bản ghi</Button> : undefined} />}
        {editor.status === 'FAILED' && <ErrorState title={editor.failedAction === 'save' ? 'Không thể lưu bản ghi' : editor.failedAction === 'load' ? 'Không thể tải bản ghi' : 'Không thể tạo bản ghi'} description={editor.error ?? 'Vui lòng thử lại.'} onRetry={retry} retryLabel="Thử lại" />}
        {editor.draft && editor.draft.segments.length > 0 && editor.status !== 'LOADING' && editor.status !== 'GENERATING' && <div className="transcript-segment-list" aria-label="Các phân đoạn bản ghi">{editor.draft.segments.map((segment) => <TranscriptSegmentEditor key={segment.id} segment={segment} error={editor.segmentErrors[segment.id]} disabled onChange={editor.updateSegment} />)}</div>}
        {editor.draft && editor.draft.segments.length === 0 && <EmptyState title="Không có phân đoạn bản ghi" description="Thử tạo lại bản ghi từ phương tiện nguồn." action={<Button onClick={editor.generate}>Tạo lại bản ghi</Button>} />}
        {editor.draft && <div className="transcript-actions"><div className="transcript-actions__status" role="status">Bản ghi được lưu trên máy chủ. Chỉnh sửa bản ghi hiện chưa được hỗ trợ.</div><div className="transcript-actions__next"><Button variant="secondary" disabled={!canContinue} onClick={() => navigate(`/projects/${project.id}/translation`)}>Tiếp tục đến bản dịch</Button><span>{canContinue ? 'Bản ghi sẵn sàng để dịch.' : 'Bản ghi chưa sẵn sàng.'}</span></div></div>}
      </Card>
    </div>
  </>
}
