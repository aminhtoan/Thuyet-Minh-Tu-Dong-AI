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
    <PageHeader title="Bản dịch" description="Kiểm tra nội dung bản ghi đã dịch." />
    <Card><ErrorState title="Không tìm thấy dự án" description="Dự án này không khả dụng." />
      <Link to="/projects" className="button button--secondary button--md">Quay lại dự án</Link>
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
    <PageHeader title="Bản dịch" description="So sánh bản ghi gốc và kiểm tra từng phân đoạn đã dịch."
      actions={<Button variant="secondary" disabled={editor.busy} onClick={backToTranscript}>Quay lại bản ghi</Button>} />
    <div className="translation-heading"><div><span className="translation-label">KHÔNG GIAN DỰ ÁN</span><h2>{project.name}</h2></div>
      <Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{editor.status.replace('_', ' ')}</Badge>
    </div>
    <WorkflowSteps current="translation" />
    {editor.status === 'LOADING' && <Card className="translation-loading"><Spinner label="Đang tải bản dịch" /><p role="status">Đang tải bản ghi và bản dịch...</p></Card>}
    {editor.status === 'FAILED' && <Card><ErrorState
      title={editor.failedAction === 'save' ? 'Không thể lưu bản dịch' : editor.failedAction === 'load' ? 'Không thể tải bản dịch' : 'Không thể dịch bản ghi'}
      description={editor.error ?? 'Vui lòng thử lại.'} onRetry={editor.retry} /></Card>}
    {!editor.transcript && editor.status === 'NOT_STARTED' && <Card><EmptyState title="Cần có bản ghi trước khi dịch"
      description="Hãy tạo, kiểm tra và lưu bản ghi trước."
      action={<Button onClick={backToTranscript}>Quay lại bản ghi</Button>} /></Card>}
    {showSource && <div className="translation-workspace">
      <Card className="translation-language-card">
        <div><span className="translation-label">Ngôn ngữ nguồn</span><p className="translation-source-language">{languageNames[sourceLanguage]}</p></div>
        <div className="translation-language-field">
          <label htmlFor="target-language">Ngôn ngữ đích</label>
          <select id="target-language" value={editor.targetLanguage ?? ''} disabled={!editor.canChangeTarget}
            aria-describedby="translation-language-help"
            onChange={(event) => { if (isLanguageCode(event.target.value)) editor.changeTarget(event.target.value); }}>
            {filterTargetLanguages(sourceLanguage).map((language) => <option key={language.code} value={language.code}>
              {language.name === language.nativeName ? language.name : language.name + ' (' + language.nativeName + ')'}
            </option>)}
          </select>
        </div>
        {!editor.draft && <Button onClick={editor.translate} loading={editor.status === 'TRANSLATING'} disabled={editor.busy || editor.status === 'FAILED'}>Dịch</Button>}
        <p id="translation-language-help" className="translation-note">{editor.dirty ? 'Save or reset changes before choosing another language.' : 'Choose a different language to create or reopen its translation.'}</p>
        <p className="translation-note">Bản dịch mô phỏng dùng dữ liệu mẫu cố định. Nội dung nguồn đã sửa sẽ nhận bản dịch mẫu có nhãn để kiểm tra.</p>
      </Card>
      {editor.status === 'TRANSLATING' && <Card className="translation-loading"><Spinner label="Translating transcript" /><p role="status">Translating transcript... Preparing {editor.targetLanguage ? languageNames[editor.targetLanguage] : ''} sample translation.</p></Card>}
      {!editor.draft && editor.status === 'NOT_STARTED' && <p className="translation-note" role="status">Chưa có bản dịch đã lưu cho ngôn ngữ và bản ghi này. Chọn Dịch để bắt đầu.</p>}
      <div className="translation-segments" aria-label="Phân đoạn gốc và phân đoạn đã dịch">
        {editor.transcript?.segments.map((source) => {
          const translation = translationBySource.get(source.id);
          return <TranslationSegmentRow key={source.id} source={source} translation={translation}
            error={translation ? editor.errors[translation.id] : undefined} disabled={editor.busy} onChange={editor.updateSegment} />;
        })}
      </div>
      {editor.draft && <Card className="translation-actions">
        <p role="status">{editor.status === 'SAVING' ? 'Saving translation...' : editor.dirty ? 'Unsaved changes' : 'Saved'}</p>
        {editor.invalid && <p className="translation-error" role="alert">Hãy bổ sung các bản dịch còn trống trước khi lưu.</p>}
        <div className="translation-action-buttons">
          <Button variant="secondary" disabled={!editor.canReset} onClick={editor.reset}>Đặt lại thay đổi</Button>
          <Button loading={editor.status === 'SAVING'} disabled={!editor.canSave} onClick={editor.save}>Lưu bản dịch</Button>
          <Button variant="secondary" disabled={!editor.saved || editor.dirty || editor.invalid || editor.busy || editor.status === 'FAILED'} onClick={() => navigate('/projects/' + project.id + '/voice?language=' + editor.targetLanguage)}>Tiếp tục đến giọng đọc</Button>
        </div>
        <p className="translation-note">{editor.saved ? 'Reset restores your last saved translation.' : 'Reset discards this unsaved translation so you can start again or change language.'}</p>
        <p className="translation-note">Hãy lưu mọi thay đổi bản dịch trước khi chọn giọng đọc thuyết minh.</p>
      </Card>}
    </div>}
  </>;
}
