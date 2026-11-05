import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { WorkflowSteps } from '../components/common/WorkflowSteps';
import { WorkflowReadOnlyNotice, WorkflowRouteRecovery } from '../components/common/WorkflowRouteGuard';
import { PageHeader } from '../components/layout/PageHeader';
import { resolveWorkflowRouteAccess } from '../features/projects/workflowRouteGuard';
import { ProjectStatusBadge } from '../features/projects/ProjectStatusBadge';
import { useProject } from '../features/projects/useProjects';
import { languageNames } from '../features/projects/projectUtils';
import type { LanguageCode, Project } from '../features/projects/types';
import { TranslationSegmentRow } from '../features/translation/TranslationSegmentRow';
import { useTranslationEditor } from '../features/translation/useTranslationEditor';
import { buildTranslationPresentation } from '../features/translation/translationPresentation.mjs';
import { translationLanguageLabel } from '../features/translation/translationLanguages.mjs';
import { translationStatusLabels } from '../localization/statusLabels.mjs';
import '../styles/translation.css';
import { GroupTranslationWorkspace } from '../features/translation/GroupTranslationWorkspace';
import { TranslationSourcePreflight } from '../features/translation/TranslationSourcePreflight';
import { CustomerSimplePreflight } from '../features/translation/CustomerSimplePreflight';
import { sourceState } from '../features/projects/sourceLanguage';

export function TranslationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const language = params.get('language');
  const { project, isLoading, error } = useProject(projectId);
  if (isLoading) return <Card><Spinner label="Đang tải dự án" /></Card>;
  if (error) return <Card><ErrorState title="Không thể tải dự án" description={error} /></Card>;
  if (!project) return <>
    <PageHeader title="Bản dịch" />
    <Card><ErrorState title="Không tìm thấy dự án" description="Dự án này không khả dụng." />
      <Link to="/projects" className="button button--secondary button--md">Quay lại dự án</Link>
    </Card>
  </>;
  if (!sourceState(project).confirmed) return <><PageHeader title="Bản dịch" /><Card><h2>Cần xác nhận ngôn ngữ nguồn</h2><p>Hãy đọc bản ghi và xác nhận ngôn ngữ chính trước khi bắt đầu dịch.</p><Link className="button button--primary button--md" to={`/projects/${project.id}/transcript`}>Kiểm tra bản ghi và xác nhận nguồn</Link></Card></>;
  const access = resolveWorkflowRouteAccess(project.workflow, 'TRANSLATION', language);
  if (!access.allowed) return <><PageHeader title="Bản dịch" /><WorkflowRouteRecovery projectId={project.id} access={access} /></>;
  const preferredTarget = language?.trim().toLowerCase() || access.targetLanguage || '';
  const simplePreflight = <CustomerSimplePreflight key={project.id + preferredTarget} projectId={project.id} targetLanguage={preferredTarget} />;
  if (import.meta.env.VITE_CUSTOMER_TRANSLATION_ENABLED === 'true') return <div className="translation-page"><GroupTranslationWorkspace key={project.id + preferredTarget} project={project} preferredTarget={preferredTarget} canMutate={access.canMutate} notice={access.reason} customerMode />{simplePreflight}</div>;
  return <div className="translation-page"><TranslationSourcePreflight key={project.id + preferredTarget} projectId={project.id}>{_blockGeneration =>
    import.meta.env.VITE_GROUP_TRANSLATION_ENABLED === 'true'
      ? <GroupTranslationWorkspace project={project} preferredTarget={preferredTarget} canMutate={access.canMutate} notice={access.reason} blockGeneration={false} />
      : <TranslationWorkspace project={project} preferredTarget={preferredTarget} canMutate={access.canMutate} notice={access.reason} blockGeneration={false} />
  }</TranslationSourcePreflight>{simplePreflight}</div>;
}

function TranslationWorkspace({ project, preferredTarget, canMutate, notice, blockGeneration }: { project: Project; preferredTarget: LanguageCode; canMutate: boolean; notice: string | null; blockGeneration: boolean }) {
  const editor = useTranslationEditor(project.id, preferredTarget);
  const navigate = useNavigate();
  function backToTranscript() {
    if (editor.dirty && !window.confirm('Hủy các thay đổi bản dịch chưa lưu và quay lại Bản ghi?')) return;
    navigate('/projects/' + project.id + '/transcript');
  }
  const matchesSource = !editor.draft || (editor.draft.projectId === project.id && editor.draft.sourceLanguage === editor.transcript?.languageCode && editor.draft.targetLanguage === editor.targetLanguage && editor.draft.sourceRevision === editor.transcript?.updatedAt);
  const presentation = buildTranslationPresentation(editor.transcript?.segments ?? [], matchesSource ? editor.draft?.segments : []);
  const sourceLanguage = editor.transcript?.languageCode ?? project.sourceLanguage;
  const showSource = editor.transcript && editor.status !== 'LOADING';
  const languageStatusMessage = editor.languageStatus === 'LOADING'
    ? 'Đang tải danh sách ngôn ngữ...'
    : editor.languageStatus === 'ERROR'
      ? 'Không thể tải danh sách ngôn ngữ. Chọn Thử lại để tải lại.'
      : editor.languageStatus === 'EMPTY'
        ? 'Chưa có ngôn ngữ đích được cấu hình. Vui lòng liên hệ quản trị viên để bổ sung ngôn ngữ được hỗ trợ.'
        : null;
  return <>
    <PageHeader title="Bản dịch"
      actions={<Button variant="secondary" disabled={editor.busy} onClick={backToTranscript}>Quay lại bản ghi</Button>} />
    <div className="translation-heading"><div><span className="translation-label">DỰ ÁN</span><h2>{project.name}</h2></div>
      <div className="translation-heading__statuses">
        <ProjectStatusBadge status={project.status} />
        <Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{translationStatusLabels[editor.status]}</Badge>
      </div>
    </div>
      <WorkflowSteps workflow={project.workflow} projectId={project.id} pageStep="TRANSLATION" />
    <WorkflowReadOnlyNotice reason={notice} />
    {editor.status === 'LOADING' && <Card className="translation-loading"><Spinner label="Đang tải bản dịch" /><p role="status">Đang tải bản ghi và bản dịch...</p></Card>}
    {editor.status === 'FAILED' && <Card><ErrorState
      title={editor.failedAction === 'save' ? 'Không thể lưu bản dịch' : editor.failedAction === 'load' ? 'Không thể tải bản dịch' : 'Không thể dịch bản ghi'}
      description={editor.error ?? 'Vui lòng thử lại.'} onRetry={editor.failedAction === 'load' || (canMutate && !blockGeneration) ? editor.retry : undefined} /></Card>}
    {!editor.transcript && editor.status === 'NOT_STARTED' && <Card><EmptyState title="Cần có bản ghi trước khi dịch"
      description="Hãy tạo, kiểm tra và lưu bản ghi trước."
      action={<Button onClick={backToTranscript}>Quay lại bản ghi</Button>} /></Card>}
    {showSource && <div className="translation-workspace">
      <Card className="translation-language-card">
        <div><span className="translation-label">Ngôn ngữ nguồn</span><p className="translation-source-language">{translationLanguageLabel({ code: sourceLanguage ?? '', name: sourceLanguage ? languageNames[sourceLanguage] ?? sourceLanguage : 'Chưa xác định', nativeName: '' })}</p></div>
        <div className="translation-language-field">
          <label htmlFor="target-language">Ngôn ngữ đích</label>
          <select id="target-language" value={editor.targetLanguage ?? ''} disabled={!canMutate || !editor.canChangeTarget}
            aria-describedby={languageStatusMessage ? 'translation-language-status' : undefined}
            onChange={(event) => editor.changeTarget(event.target.value)}>
            <option value="" disabled>Chọn ngôn ngữ cần dịch</option>
            {editor.targetChoices.map((language) => <option key={language.code} value={language.code}>
              {translationLanguageLabel(language)}
            </option>)}
          </select>
        </div>
        {!editor.draft && <Button onClick={() => { if (!blockGeneration) void editor.translate(); }} loading={editor.status === 'TRANSLATING'} disabled={blockGeneration || !canMutate || !editor.targetLanguage || editor.busy || editor.status === 'FAILED'}>Dịch</Button>}
        {languageStatusMessage && <p id="translation-language-status" className="translation-note" role="status">{languageStatusMessage}</p>}
      </Card>
      {editor.status === 'TRANSLATING' && <Card className="translation-loading"><Spinner label="Đang dịch bằng AI" /><p role="status">Đang dịch bằng AI...</p></Card>}
      {!editor.draft && editor.status === 'NOT_STARTED' && editor.targetLanguage && <p className="translation-note" role="status">Chưa có bản dịch cho ngôn ngữ đã chọn.</p>}
      {presentation.notice && <p className="translation-note" role="status">{presentation.notice}</p>}
      <div className="translation-segments" aria-label="Phân đoạn gốc và phân đoạn đã dịch">
        {presentation.rows.map(({ source, translation }) => {
          return <TranslationSegmentRow key={source.id} source={source} translation={translation}
            error={translation ? editor.errors[translation.id] : undefined} />;
        })}
      </div>
      {editor.draft && <Card className="translation-actions">
        <p role="status">Bản dịch đã được lưu trên máy chủ và hiện ở chế độ chỉ đọc.</p>
        {editor.invalid && <p className="translation-error" role="alert">Hãy bổ sung các bản dịch còn trống trước khi lưu.</p>}
        <div className="translation-action-buttons">
          <Button variant="secondary" disabled={!canMutate || !editor.canReset} onClick={editor.reset}>Đặt lại thay đổi</Button>
          <Button loading={editor.status === 'SAVING'} disabled={!canMutate || !editor.canSave} onClick={editor.save}>Lưu bản dịch</Button>
          <Button variant="secondary" disabled={!editor.saved || editor.busy || editor.status === 'FAILED' || Boolean(presentation.notice)} onClick={() => navigate('/projects/' + project.id + '/voice?language=' + editor.targetLanguage)}>Tiếp tục đến giọng đọc</Button>
        </div>
        <p className="translation-note">{editor.saved ? 'Đặt lại sẽ khôi phục bản dịch đã lưu gần nhất.' : 'Đặt lại sẽ hủy bản dịch chưa lưu để bạn bắt đầu lại hoặc đổi ngôn ngữ.'}</p>
        <p className="translation-note">Hãy lưu mọi thay đổi bản dịch trước khi chọn giọng đọc thuyết minh.</p>
      </Card>}
    </div>}
  </>;
}
