import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ProgressBar } from '../components/common/ProgressBar';
import { Spinner } from '../components/common/Spinner';
import { WorkflowSteps } from '../components/common/WorkflowSteps';
import { PageHeader } from '../components/layout/PageHeader';
import { isLanguageCode } from '../features/projects/languages';
import { projectRepository } from '../features/projects/projectRepository';
import { languageNames } from '../features/projects/projectUtils';
import type { LanguageCode, Project } from '../features/projects/types';
import { ProcessingStage } from '../features/processing/ProcessingStage';
import { getSimulatedProjectStatus } from '../features/processing/processingUtils';
import { useProcessing } from '../features/processing/useProcessing';
import { formatSpeed } from '../features/voice/voiceUtils';
import '../styles/processing.css';

export function GeneratePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const language = params.get('language');
  const project = projectId ? projectRepository.getById(projectId) : undefined;
  if (!project || (language !== null && !isLanguageCode(language))) return <>
    <PageHeader title="Generate Narration" description="Review your saved narration settings." />
    <Card><ErrorState title={project ? 'Language unavailable' : 'Project not found'} description="Open a saved Voice configuration to begin." />
      <Link className="button button--secondary button--md" to={project ? '/projects/' + project.id + '/voice' : '/projects'}>Back to {project ? 'Voice Settings' : 'Projects'}</Link>
    </Card>
  </>;
  return <GenerateWorkspace key={project.id + (language ?? '')} project={project} language={language ?? undefined} />;
}

function GenerateWorkspace({ project, language }: { project: Project; language?: LanguageCode }) {
  const processing = useProcessing(project.id, language);
  const [confirmed, setConfirmed] = useState(false);
  const navigate = useNavigate();
  const { context, snapshot, busy } = processing;
  const target = context?.config.languageCode ?? language;
  function edit(destination: 'voice' | 'translation') {
    if (busy) return;
    navigate('/projects/' + project.id + '/' + destination + (target ? '?language=' + target : ''));
  }
  useEffect(() => {
    if (!busy) return;
    const warnOnReload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnOnReload);
    return () => window.removeEventListener('beforeunload', warnOnReload);
  }, [busy]);
  const failedStage = snapshot?.error?.stage === 'start' ? 'Start generation' : snapshot?.stages.find((stage) => stage.id === snapshot?.error?.stage)?.title;
  return <>
    <PageHeader title="Generate Narration" description="Review your settings before starting the processing simulation."
      actions={<Button variant="secondary" disabled={busy} onClick={() => edit('voice')}>Back to Voice Settings</Button>} />
    <div className="generation-heading"><h2>{project.name}</h2><Badge variant="info">SIMULATION</Badge></div>
    <WorkflowSteps current="generate" />
    {processing.loadStatus === 'LOADING' && <Card className="processing-loading"><Spinner label="Loading generation settings" /><p role="status">Loading saved generation settings...</p></Card>}
    {processing.loadStatus === 'FAILED' && <Card><ErrorState title="Unable to load generation settings" description={processing.error ?? 'Please retry.'} onRetry={processing.reload} /></Card>}
    {processing.loadStatus === 'READY' && !context && <Card><EmptyState title="Saved voice configuration required"
      description="Save a valid translation, voice and speech speed before generating."
      action={<Button onClick={() => edit('voice')}>Back to Voice Settings</Button>} /></Card>}
    {context && snapshot && <div className="generation-layout">
      <Card className="generation-summary"><h2>Generation Summary</h2>
        <dl>
          <div><dt>Project</dt><dd>{context.project.name}</dd></div>
          <div><dt>Source language</dt><dd>{languageNames[context.transcript.languageCode]}</dd></div>
          <div><dt>Target language</dt><dd>{languageNames[context.translation.targetLanguage]}</dd></div>
          <div><dt>Transcript</dt><dd>{context.transcript.segments.length} segments</dd></div>
          <div><dt>Translation</dt><dd>{context.translation.segments.length} segments</dd></div>
          <div><dt>Voice</dt><dd>{context.voice.name}</dd></div>
          <div><dt>Speech speed</dt><dd>{formatSpeed(context.config.speed)}</dd></div>
          <div><dt>Media</dt><dd>{context.project.mediaName ?? 'Saved mock media reference'} ({context.project.mediaType.toLowerCase()})</dd></div>
        </dl>
        <div className="generation-actions"><Button variant="secondary" disabled={busy} onClick={() => edit('translation')}>Edit Translation</Button>
          <Button variant="secondary" disabled={busy} onClick={() => edit('voice')}>Edit Voice</Button></div>
        <p className="processing-note">This demo simulates progress only. It does not create narration audio or a processed media file.</p>
        {snapshot.status === 'WAITING' && <>
          <label className="generation-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I reviewed the language, voice and speech speed.</label>
          <Button disabled={!confirmed} onClick={processing.start}>{project.mediaType === 'VIDEO' ? 'Generate Video' : 'Generate Audio'}</Button>
        </>}
      </Card>
      <Card className="processing-panel">
        <div className="processing-panel__heading"><h2>{snapshot.status === 'COMPLETED' ? 'Processing Complete' : snapshot.status === 'FAILED' ? 'Processing Failed' : snapshot.status === 'CANCELLED' ? 'Processing Cancelled' : 'Processing Pipeline'}</h2>
          <Badge variant={snapshot.status === 'COMPLETED' ? 'success' : snapshot.status === 'FAILED' ? 'error' : 'info'}>{snapshot.status}</Badge></div>
        <p className="processing-note">Simulated project status: {getSimulatedProjectStatus(snapshot, project.mediaType)}</p>
        <ProgressBar value={snapshot.progress} label="Overall processing progress" />
        <p className="processing-message" role="status">{snapshot.message}</p>
        <ol className="processing-stages" aria-label="Processing stages">{snapshot.stages.map((stage) => <ProcessingStage key={stage.id} stage={stage} />)}</ol>
        {busy && <><p className="processing-note">Keep this page open during the demo. Leaving cancels the simulation.</p>
          <Button variant="secondary" onClick={processing.cancel}>Cancel Processing</Button></>}
        {snapshot.status === 'FAILED' && <div className="processing-outcome" role="alert"><h3>Processing Failed</h3>
          <p>Stage: {failedStage ?? 'Generation'}</p><p>{snapshot.error?.message}</p>
          <Button onClick={processing.retry}>Retry Processing</Button><p className="processing-note">Retry restarts both generation stages from 0%.</p></div>}
        {snapshot.status === 'CANCELLED' && <div className="processing-outcome"><Button onClick={processing.retry}>Restart Generation</Button><p className="processing-note">Restart begins both simulated stages from 0%.</p></div>}
        {snapshot.status === 'COMPLETED' && <div className="processing-outcome"><h3>All demo stages completed</h3><p>No output file was generated.</p>
          <Button onClick={() => navigate('/projects/' + project.id + '/result?language=' + target)}>View Result</Button><p className="processing-note">View the mock result metadata; no real media is available.</p></div>}
      </Card>
    </div>}
  </>;
}
