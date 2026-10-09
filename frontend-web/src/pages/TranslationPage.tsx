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
import { useProject } from '../features/projects/useProjects';
import { languageNames } from '../features/projects/projectUtils';
import type { LanguageCode, Project } from '../features/projects/types';
import { TranslationSegmentRow } from '../features/translation/TranslationSegmentRow';
import { useTranslationEditor } from '../features/translation/useTranslationEditor';
import '../styles/translation.css';

export function TranslationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const language = params.get('language');
  const { project, isLoading, error } = useProject(projectId);
  if (isLoading) return <Card><Spinner label="Đang tải dự án" /></Card>;
  if (error) return <Card><ErrorState title="Không thể tải dự án" description={error} /></Card>;
  if (!project) return <>
    <PageHeader title="Bản dịch" description="Kiểm tra nội dung bản ghi đã dịch." />
    <Card><ErrorState title="Không tìm thấy dự án" description="Dự án này không khả dụng." />
      <Link to="/projects" className="button button--secondary button--md">Quay lại dự án</Link>
    </Card>
  </>;
  const preferredTarget = language && isLanguageCode(language) ? language : project.targetLanguage ?? '';
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
            {editor.targetChoices.map((language) => <option key={language.code} value={language.code}>
              {language.name === language.nativeName ? language.name : language.name + ' (' + language.nativeName + ')'}
            </option>)}
          </select>
        </div>
        {!editor.draft && <Button onClick={editor.translate} loading={editor.status === 'TRANSLATING'} disabled={editor.busy || editor.status === 'FAILED'}>Dịch</Button>}
        <p id="translation-language-help" className="translation-note">Chọn ngôn ngữ để tạo hoặc mở lại bản dịch đã lưu.</p>
        <p className="translation-note">Bản dịch được tạo bởi dịch vụ trên máy chủ và lưu theo dự án.</p>
      </Card>
      {editor.status === 'TRANSLATING' && <Card className="translation-loading"><Spinner label="Đang dịch bản ghi" /><p role="status">Đang tạo bản dịch {editor.targetLanguage ? languageNames[editor.targetLanguage] : ''}...</p></Card>}
      {!editor.draft && editor.status === 'NOT_STARTED' && <p className="translation-note" role="status">Chưa có bản dịch đã lưu cho ngôn ngữ và bản ghi này. Chọn Dịch để bắt đầu.</p>}
      <div className="translation-segments" aria-label="Phân đoạn gốc và phân đoạn đã dịch">
        {editor.transcript?.segments.map((source) => {
          const translation = translationBySource.get(source.id);
          return <TranslationSegmentRow key={source.id} source={source} translation={translation}
            error={translation ? editor.errors[translation.id] : undefined} disabled onChange={editor.updateSegment} />;
        })}
      </div>
      {editor.draft && <Card className="translation-actions">
        <p role="status">Bản dịch được lưu bởi backend. Chỉnh sửa bản dịch hiện chưa được hỗ trợ.</p>
        {editor.invalid && <p className="translation-error" role="alert">Hãy bổ sung các bản dịch còn trống trước khi lưu.</p>}
        <div className="translation-action-buttons">
          <Button variant="secondary" disabled={!editor.canReset} onClick={editor.reset}>Đặt lại thay đổi</Button>
          <Button loading={editor.status === 'SAVING'} disabled={!editor.canSave} onClick={editor.save}>Lưu bản dịch</Button>
          <Button variant="secondary" disabled={!editor.saved || editor.busy || editor.status === 'FAILED'} onClick={() => navigate('/projects/' + project.id + '/voice?language=' + editor.targetLanguage)}>Tiếp tục đến giọng đọc</Button>
        </div>
        <p className="translation-note">{editor.saved ? 'Reset restores your last saved translation.' : 'Reset discards this unsaved translation so you can start again or change language.'}</p>
        <p className="translation-note">Hãy lưu mọi thay đổi bản dịch trước khi chọn giọng đọc thuyết minh.</p>
      </Card>}
    </div>}
  </>;
}
