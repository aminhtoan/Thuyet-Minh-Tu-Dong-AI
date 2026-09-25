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
  if (!project || !projectId) return <><PageHeader title="Transcript" description="Review your project's spoken content." /><Card padding="lg"><ErrorState title="Project not found" description="This project is not available in the current mock data." /><Link className="button button--secondary button--md" to="/projects">Back to Projects</Link></Card></>
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
    <PageHeader title="Transcript" description="Review and correct each timestamped segment before translation." actions={<Link className="button button--secondary button--md" to="/projects">Back to Projects</Link>} />
    <div className="transcript-intro"><div><span className="transcript-eyebrow">PROJECT WORKSPACE</span><h2>{project.name}</h2><p>Source language: {languageNames[project.sourceLanguage]} · Transcript generation is simulated in this sprint.</p></div><Badge variant={stage === 'TRANSCRIBED' ? 'success' : 'info'}>{stage}</Badge></div>
    <WorkflowSteps current="transcript" />
    <div className="transcript-layout">
      <Card padding="lg" className="transcript-media"><h2>Source media</h2><div className="transcript-media__icon" aria-hidden="true">{project.mediaType === 'VIDEO' ? '▶' : '♫'}</div><strong>{project.mediaName ?? 'Mock media reference'}</strong><p>{project.mediaType === 'VIDEO' ? 'Video' : 'Audio'} · {languageNames[project.sourceLanguage]}{project.mediaSize ? ` · ${formatFileSize(project.mediaSize)}` : ''}{project.durationSeconds ? ` · ${formatTimestamp(project.durationSeconds)}` : ''}</p><div className="transcript-media__note">Preview is unavailable because the S5 mock upload does not store a playable file.</div></Card>
      <Card padding="lg" className="transcript-editor"><div className="transcript-editor__heading"><div><h2>Transcript segments</h2><p>{editor.draft ? `${editor.draft.segments.length} timestamped segments` : 'Generate a sample transcript to start reviewing.'}</p></div><Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{editor.status.replace('_', ' ')}</Badge></div>
        {editor.status === 'LOADING' && <div className="transcript-centered" role="status"><Spinner size="lg" label="Loading transcript" /><p>Loading transcript...</p></div>}
        {editor.status === 'GENERATING' && <div className="transcript-centered" role="status"><Spinner size="lg" label="Generating mock transcript" /><h3>Generating transcript...</h3><p>Preparing sample segments. No speech-to-text provider is called.</p></div>}
        {editor.status === 'NOT_STARTED' && <EmptyState title="No transcript available" description={canGenerate ? 'Your media is ready for a sample transcript.' : 'Upload media before generating a transcript.'} action={canGenerate ? <Button onClick={editor.generate}>Generate Transcript</Button> : undefined} />}
        {editor.status === 'FAILED' && <ErrorState title={editor.failedAction === 'save' ? 'Unable to save transcript' : editor.failedAction === 'load' ? 'Unable to load transcript' : 'Unable to generate transcript'} description={editor.error ?? 'Please try again.'} onRetry={retry} retryLabel="Retry" />}
        {editor.draft && editor.draft.segments.length > 0 && editor.status !== 'LOADING' && editor.status !== 'GENERATING' && <div className="transcript-segment-list" aria-label="Transcript segments">{editor.draft.segments.map((segment) => <TranscriptSegmentEditor key={segment.id} segment={segment} error={editor.segmentErrors[segment.id]} disabled={isBusy} onChange={editor.updateSegment} />)}</div>}
        {editor.draft && editor.draft.segments.length === 0 && <EmptyState title="No transcript segments" description="Generate a new sample transcript to begin." action={<Button onClick={editor.generate}>Generate Transcript</Button>} />}
        {editor.draft && <div className="transcript-actions"><div className="transcript-actions__status" role="status">{editor.status === 'SAVING' ? 'Saving transcript...' : editor.dirty ? 'Unsaved changes' : 'Saved in this development session'}{editor.hasInvalidSegments && <span className="transcript-actions__error">Correct empty segments before saving.</span>}</div><div className="transcript-actions__buttons"><Button variant="secondary" disabled={!editor.canReset} onClick={editor.resetChanges}>Reset Changes</Button><Button loading={editor.status === 'SAVING'} disabled={!editor.canSave} onClick={editor.saveTranscript}>Save Transcript</Button></div><div className="transcript-actions__next"><Button variant="secondary" disabled={!canContinue} onClick={() => navigate(`/projects/${project.id}/translation`)}>Continue to Translation</Button><span>{canContinue ? 'Your saved transcript is ready for translation.' : 'Save all changes before continuing to Translation.'}</span></div></div>}
      </Card>
    </div>
  </>
}
