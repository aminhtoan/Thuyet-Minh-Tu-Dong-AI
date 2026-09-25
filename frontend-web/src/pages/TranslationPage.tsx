import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { WorkflowSteps } from '../components/common/WorkflowSteps';
import { PageHeader } from '../components/layout/PageHeader';
import { filterTargetLanguages, isLanguageCode } from '../features/projects/languages';
import { projectRepository } from '../features/projects/projectRepository';
import { languageNames } from '../features/projects/projectUtils';
import type { LanguageCode, Project } from '../features/projects/types';
import { TranslationSegmentRow } from '../features/translation/TranslationSegmentRow';
import { useTranslationEditor } from '../features/translation/useTranslationEditor';
import '../styles/translation.css';

export function TranslationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const language = params.get('language');
  const project = projectId ? projectRepository.getById(projectId) : undefined;
  if (!project) return <>
    <PageHeader title="Translation" description="Review your translated transcript." />
    <Card><ErrorState title="Project not found" description="This project is not available." />
      <Link to="/projects" className="button button--secondary button--md">Back to Projects</Link>
    </Card>
  </>;
  const preferredTarget = language && isLanguageCode(language) ? language : project.targetLanguage;
  return <TranslationWorkspace key={project.id + preferredTarget} project={project} preferredTarget={preferredTarget} />;
}

function TranslationWorkspace({ project, preferredTarget }: { project: Project; preferredTarget: LanguageCode }) {
  const editor = useTranslationEditor(project.id, preferredTarget);
  const navigate = useNavigate();
  function backToTranscript() {
    if (editor.dirty && !window.confirm('Discard unsaved translation changes and return to Transcript?')) return;
    navigate('/projects/' + project.id + '/transcript');
  }
  const translationBySource = new Map(editor.draft?.segments.map((segment) => [segment.transcriptSegmentId, segment]));
  const sourceLanguage = editor.transcript?.languageCode ?? project.sourceLanguage;
  const showSource = editor.transcript && editor.status !== 'LOADING';
  return <>
    <PageHeader title="Translation" description="Compare the original transcript and review each translated segment."
      actions={<Button variant="secondary" disabled={editor.busy} onClick={backToTranscript}>Back to Transcript</Button>} />
    <div className="translation-heading"><div><span className="translation-label">PROJECT WORKSPACE</span><h2>{project.name}</h2></div>
      <Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{editor.status.replace('_', ' ')}</Badge>
    </div>
    <WorkflowSteps current="translation" />
    {editor.status === 'LOADING' && <Card className="translation-loading"><Spinner label="Loading translation" /><p role="status">Loading transcript and translation...</p></Card>}
    {editor.status === 'FAILED' && <Card><ErrorState
      title={editor.failedAction === 'save' ? 'Unable to save translation' : editor.failedAction === 'load' ? 'Unable to load translation' : 'Unable to translate transcript'}
      description={editor.error ?? 'Please try again.'} onRetry={editor.retry} /></Card>}
    {!editor.transcript && editor.status === 'NOT_STARTED' && <Card><EmptyState title="Transcript required before translation"
      description="Generate, review and save your transcript first."
      action={<Button onClick={backToTranscript}>Back to Transcript</Button>} /></Card>}
    {showSource && <div className="translation-workspace">
      <Card className="translation-language-card">
        <div><span className="translation-label">Source language</span><p className="translation-source-language">{languageNames[sourceLanguage]}</p></div>
        <div className="translation-language-field">
          <label htmlFor="target-language">Target language</label>
          <select id="target-language" value={editor.targetLanguage ?? ''} disabled={!editor.canChangeTarget}
            aria-describedby="translation-language-help"
            onChange={(event) => { if (isLanguageCode(event.target.value)) editor.changeTarget(event.target.value); }}>
            {filterTargetLanguages(sourceLanguage).map((language) => <option key={language.code} value={language.code}>
              {language.name === language.nativeName ? language.name : language.name + ' (' + language.nativeName + ')'}
            </option>)}
          </select>
        </div>
        {!editor.draft && <Button onClick={editor.translate} loading={editor.status === 'TRANSLATING'} disabled={editor.busy || editor.status === 'FAILED'}>Translate</Button>}
        <p id="translation-language-help" className="translation-note">{editor.dirty ? 'Save or reset changes before choosing another language.' : 'Choose a different language to create or reopen its translation.'}</p>
        <p className="translation-note">Demo translation uses fixed samples. Edited source text receives labelled sample content for you to review.</p>
      </Card>
      {editor.status === 'TRANSLATING' && <Card className="translation-loading"><Spinner label="Translating transcript" /><p role="status">Translating transcript... Preparing {editor.targetLanguage ? languageNames[editor.targetLanguage] : ''} sample translation.</p></Card>}
      {!editor.draft && editor.status === 'NOT_STARTED' && <p className="translation-note" role="status">No saved translation for this language and transcript. Select Translate to begin.</p>}
      <div className="translation-segments" aria-label="Original and translated segments">
        {editor.transcript?.segments.map((source) => {
          const translation = translationBySource.get(source.id);
          return <TranslationSegmentRow key={source.id} source={source} translation={translation}
            error={translation ? editor.errors[translation.id] : undefined} disabled={editor.busy} onChange={editor.updateSegment} />;
        })}
      </div>
      {editor.draft && <Card className="translation-actions">
        <p role="status">{editor.status === 'SAVING' ? 'Saving translation...' : editor.dirty ? 'Unsaved changes' : 'Saved'}</p>
        {editor.invalid && <p className="translation-error" role="alert">Correct empty translations before saving.</p>}
        <div className="translation-action-buttons">
          <Button variant="secondary" disabled={!editor.canReset} onClick={editor.reset}>Reset Changes</Button>
          <Button loading={editor.status === 'SAVING'} disabled={!editor.canSave} onClick={editor.save}>Save Translation</Button>
          <Button variant="secondary" disabled={!editor.saved || editor.dirty || editor.invalid || editor.busy || editor.status === 'FAILED'} onClick={() => navigate('/projects/' + project.id + '/voice?language=' + editor.targetLanguage)}>Continue to Voice / TTS</Button>
        </div>
        <p className="translation-note">{editor.saved ? 'Reset restores your last saved translation.' : 'Reset discards this unsaved translation so you can start again or change language.'}</p>
        <p className="translation-note">Save all translation changes before choosing a narration voice.</p>
      </Card>}
    </div>}
  </>;
}
