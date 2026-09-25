import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { WorkflowSteps } from '../components/common/WorkflowSteps';
import { PageHeader } from '../components/layout/PageHeader';
import { isLanguageCode } from '../features/projects/languages';
import { projectRepository } from '../features/projects/projectRepository';
import { languageNames } from '../features/projects/projectUtils';
import type { LanguageCode, Project } from '../features/projects/types';
import { VoiceCard } from '../features/voice/VoiceCard';
import { useVoiceEditor } from '../features/voice/useVoiceEditor';
import { formatSpeed, MAX_SPEED, MIN_SPEED, voiceFilters } from '../features/voice/voiceUtils';
import '../styles/voice.css';

export function VoicePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const requestedLanguage = params.get('language');
  const project = projectId ? projectRepository.getById(projectId) : undefined;
  if (!project || (requestedLanguage !== null && !isLanguageCode(requestedLanguage))) return <>
    <PageHeader title="Voice & Narration" description="Choose a voice for your translation." />
    <Card><ErrorState title={project ? 'Language unavailable' : 'Project not found'} description="Open a saved translation to choose its narration voice." />
      <Link className="button button--secondary button--md" to={project ? '/projects/' + project.id + '/translation' : '/projects'}>Back to {project ? 'Translation' : 'Projects'}</Link></Card>
  </>;
  return <VoiceWorkspace key={project.id + (requestedLanguage ?? '')} project={project} language={requestedLanguage ?? undefined} />;
}

function VoiceWorkspace({ project, language }: { project: Project; language?: LanguageCode }) {
  const editor = useVoiceEditor(project.id, language);
  const navigate = useNavigate();
  const target = editor.translation?.targetLanguage ?? language;
  function backToTranslation() {
    editor.stopPreview();
    if (editor.dirty && !window.confirm('Discard unsaved voice configuration and return to Translation?')) return;
    navigate('/projects/' + project.id + '/translation' + (target ? '?language=' + target : ''));
  }
  const characterCount = editor.translation?.segments.reduce((count, segment) => count + segment.translatedText.length, 0) ?? 0;
  return <>
    <PageHeader title="Voice & Narration" description="Choose a voice and speech settings for your translated content."
      actions={<Button variant="secondary" disabled={editor.busy} onClick={backToTranslation}>Back to Translation</Button>} />
    <div className="voice-heading"><h2>{project.name}</h2><Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{editor.status}</Badge></div>
    <WorkflowSteps current="voice" />
    {editor.status === 'LOADING' && <Card className="voice-loading"><Spinner label="Loading voices" /><p role="status">Loading voices and configuration...</p></Card>}
    {editor.status === 'FAILED' && <Card><ErrorState title={editor.failedAction === 'save' ? 'Unable to save configuration' : 'Unable to load voices'} description={editor.error ?? 'Please retry.'} onRetry={editor.retry} /></Card>}
    {editor.status !== 'LOADING' && editor.status !== 'FAILED' && !editor.translation && <Card><EmptyState title="Translation required before selecting a voice."
      description="Review and save your translated segments first."
      action={<Button onClick={backToTranslation}>Back to Translation</Button>} /></Card>}
    {editor.translation && editor.draft && editor.status !== 'LOADING' && <div className="voice-workspace">
      <Card className="voice-summary"><div><span className="voice-label">Narration language</span><h2>{languageNames[editor.translation.targetLanguage]}</h2></div>
        <div><span className="voice-label">Saved translation</span><p>{editor.translation.segments.length} segments · {characterCount} characters</p></div>
        <blockquote>{editor.translation.segments.slice(0, 2).map((segment) => segment.translatedText).join(' ')}</blockquote>
      </Card>
      <section aria-labelledby="voice-list-heading"><div className="voice-toolbar"><h2 id="voice-list-heading">Choose Voice</h2>
        <div className="voice-filters" role="group" aria-label="Filter voices by gender">
          {voiceFilters.map((gender) => <Button key={gender} size="sm" variant={editor.gender === gender ? 'primary' : 'secondary'} aria-pressed={editor.gender === gender} onClick={() => editor.setGender(gender)}>{gender}</Button>)}
        </div><label className="voice-search">Search voices<input type="search" value={editor.query} onChange={(event) => editor.setQuery(event.target.value)} placeholder="Search by name" /></label>
      </div>
      {editor.previewError && <Card><ErrorState title="Unable to preview voice" description={editor.previewError} onRetry={() => { if (editor.failedPreviewId) void editor.preview(editor.failedPreviewId); }} /></Card>}
      {editor.visibleVoices.length ? <div className="voice-grid">
        {editor.visibleVoices.map((voice) => <VoiceCard key={voice.id} voice={voice} selected={editor.draft?.voiceId === voice.id}
          previewing={editor.previewingVoiceId === voice.id} disabled={editor.busy}
          onPreview={() => void editor.preview(voice.id)} onSelect={() => editor.updateConfig({ voiceId: voice.id })} />)}
      </div> : <Card><EmptyState title={editor.voices.length ? 'No voices match your filters.' : 'No voices are currently available for ' + languageNames[editor.translation.targetLanguage] + '.'}
        description={editor.voices.length ? 'Try another gender or clear the search.' : 'Return to Translation to review another saved language.'}
        action={editor.voices.length ? <Button variant="secondary" onClick={() => { editor.setGender('All'); editor.setQuery(''); }}>Clear filters</Button> : <Button onClick={backToTranslation}>Back to Translation</Button>} /></Card>}
      </section>
      <Card className="voice-speed"><label htmlFor="speech-speed">Speech Speed <strong>{formatSpeed(editor.draft.speed)}</strong></label>
        <input id="speech-speed" type="range" min={MIN_SPEED} max={MAX_SPEED} step={0.1} value={editor.draft.speed} disabled={editor.busy}
          aria-valuetext={formatSpeed(editor.draft.speed)} onChange={(event) => editor.updateConfig({ speed: Number(event.target.value) })} />
        <div className="voice-speed-limits"><span>0.5x</span><span>1.0x default</span><span>2.0x</span></div>
        <p className="voice-note">Slower speeds create longer narration. Faster speeds create shorter narration.</p>
      </Card>
      <Card className="voice-configuration"><h2>Narration Configuration</h2>
        <dl><div><dt>Language</dt><dd>{languageNames[editor.draft.languageCode]}</dd></div><div><dt>Voice</dt><dd>{editor.selectedVoice?.name ?? 'Not selected'}</dd></div><div><dt>Speed</dt><dd>{formatSpeed(editor.draft.speed)}</dd></div></dl>
        {editor.validationError && <p className="voice-error" role="status">{editor.validationError}</p>}
        <p role="status">{editor.status === 'SAVING' ? 'Saving configuration...' : editor.dirty ? 'Unsaved changes' : editor.saved ? 'Saved' : 'Choose a voice to configure narration.'}</p>
        <div className="voice-actions"><Button variant="secondary" disabled={!editor.dirty || editor.busy} onClick={editor.reset}>Reset Changes</Button>
          <Button loading={editor.status === 'SAVING'} disabled={!editor.canSave} onClick={editor.save}>Save Configuration</Button>
          <Button variant="secondary" disabled={!editor.saved || editor.dirty || editor.busy || Boolean(editor.validationError) || editor.status === 'FAILED'} onClick={() => { editor.stopPreview(); navigate('/projects/' + project.id + '/generate?language=' + target); }}>Continue to Generate</Button></div>
        <p className="voice-note">Save all configuration changes before continuing. The next step simulates processing.</p>
      </Card>
    </div>}
  </>;
}
