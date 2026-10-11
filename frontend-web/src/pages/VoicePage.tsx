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
import { VoiceCard } from '../features/voice/VoiceCard';
import { useVoiceEditor } from '../features/voice/useVoiceEditor';
import { formatSpeed, MAX_SPEED, MIN_SPEED, voiceFilters } from '../features/voice/voiceUtils';
import '../styles/voice.css';

export function VoicePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const requestedLanguage = params.get('language');
  const { project, isLoading, error } = useProject(projectId);
  if (isLoading) return <Card><Spinner label="Đang tải dự án" /></Card>;
  if (error) return <Card><ErrorState title="Không thể tải dự án" description={error} /></Card>;
  if (!project || (requestedLanguage !== null && !isLanguageCode(requestedLanguage))) return <>
    <PageHeader title="Giọng đọc và thuyết minh" description="Chọn giọng đọc cho bản dịch." />
    <Card><ErrorState title={project ? 'Ngôn ngữ không khả dụng' : 'Không tìm thấy dự án'} description="Mở một bản dịch đã lưu để chọn giọng đọc thuyết minh." />
      <Link className="button button--secondary button--md" to={project ? '/projects/' + project.id + '/translation' : '/projects'}>Quay lại {project ? 'bản dịch' : 'danh sách dự án'}</Link></Card>
  </>;
  return <VoiceWorkspace key={project.id + (requestedLanguage ?? '')} project={project} language={requestedLanguage ?? undefined} />;
}

function VoiceWorkspace({ project, language }: { project: Project; language?: LanguageCode }) {
  const editor = useVoiceEditor(project.id, language);
  const navigate = useNavigate();
  const target = editor.translation?.targetLanguage ?? language;
  function backToTranslation() {
    editor.stopPreview();
    if (editor.dirty && !window.confirm('Hủy cấu hình giọng đọc chưa lưu và quay lại Bản dịch?')) return;
    navigate('/projects/' + project.id + '/translation' + (target ? '?language=' + target : ''));
  }
  const characterCount = editor.translation?.segments.reduce((count, segment) => count + segment.translatedText.length, 0) ?? 0;
  return <>
    <PageHeader title="Giọng đọc và thuyết minh" description="Chọn giọng đọc và thiết lập cách đọc cho nội dung đã dịch."
      actions={<Button variant="secondary" disabled={editor.busy} onClick={backToTranslation}>Quay lại bản dịch</Button>} />
    <div className="voice-heading"><h2>{project.name}</h2><Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{editor.status}</Badge></div>
    <WorkflowSteps current="voice" />
    {editor.status === 'LOADING' && <Card className="voice-loading"><Spinner label="Đang tải giọng đọc" /><p role="status">Đang tải danh sách giọng đọc và cấu hình...</p></Card>}
    {editor.status === 'FAILED' && <Card><ErrorState title={editor.failedAction === 'save' ? 'Không thể lưu cấu hình' : 'Không thể tải giọng đọc'} description={editor.error ?? 'Vui lòng thử lại.'} onRetry={editor.retry} /></Card>}
    {editor.status !== 'LOADING' && editor.status !== 'FAILED' && !editor.translation && <Card><EmptyState title="Cần có bản dịch trước khi chọn giọng đọc."
      description="Hãy kiểm tra và lưu các phân đoạn đã dịch trước."
      action={<Button onClick={backToTranslation}>Quay lại bản dịch</Button>} /></Card>}
    {editor.translation && editor.draft && editor.status !== 'LOADING' && <div className="voice-workspace">
      <Card className="voice-summary"><div><span className="voice-label">Ngôn ngữ thuyết minh</span><h2>{languageNames[editor.translation.targetLanguage]}</h2></div>
        <div><span className="voice-label">Bản dịch đã lưu</span><p>{editor.translation.segments.length} phân đoạn · {characterCount} ký tự</p></div>
        <blockquote>{editor.translation.segments.slice(0, 2).map((segment) => segment.translatedText).join(' ')}</blockquote>
      </Card>
      <section aria-labelledby="voice-list-heading"><div className="voice-toolbar"><h2 id="voice-list-heading">Chọn giọng đọc</h2>
        <div className="voice-filters" role="group" aria-label="Lọc giọng đọc theo giới tính">
          {voiceFilters.map((gender) => <Button key={gender} size="sm" variant={editor.gender === gender ? 'primary' : 'secondary'} aria-pressed={editor.gender === gender} onClick={() => editor.setGender(gender)}>{gender === 'All' ? 'Tất cả' : gender === 'Female' ? 'Nữ' : gender === 'Male' ? 'Nam' : 'Trung tính'}</Button>)}
        </div><label className="voice-search">Tìm kiếm giọng đọc<input type="search" value={editor.query} onChange={(event) => editor.setQuery(event.target.value)} placeholder="Tìm theo tên" /></label>
      </div>
      {editor.previewError && <Card><ErrorState title="Không thể nghe thử giọng đọc" description={editor.previewError} onRetry={() => { if (editor.failedPreviewId) void editor.preview(editor.failedPreviewId); }} /></Card>}
      {editor.visibleVoices.length ? <div className="voice-grid">
        {editor.visibleVoices.map((voice) => <VoiceCard key={voice.id} voice={voice} selected={editor.draft?.voiceId === voice.id}
          previewing={editor.previewingVoiceId === voice.id} disabled={editor.busy}
          onPreview={() => void editor.preview(voice.id)} onSelect={() => editor.updateConfig({ voiceId: voice.id })} />)}
      </div> : <Card><EmptyState title={editor.voices.length ? 'Không có giọng đọc phù hợp với bộ lọc.' : 'Hiện chưa có giọng đọc cho ' + languageNames[editor.translation.targetLanguage] + '.'}
        description={editor.voices.length ? 'Hãy chọn giới tính khác hoặc xóa từ khóa.' : 'Quay lại Bản dịch để chọn ngôn ngữ đã lưu khác.'}
        action={editor.voices.length ? <Button variant="secondary" onClick={() => { editor.setGender('All'); editor.setQuery(''); }}>Xóa bộ lọc</Button> : <Button onClick={backToTranslation}>Quay lại bản dịch</Button>} /></Card>}
      </section>
      <Card className="voice-speed"><label htmlFor="speech-speed">Tốc độ đọc <strong>{formatSpeed(editor.draft.speed)}</strong></label>
        <input id="speech-speed" type="range" min={MIN_SPEED} max={MAX_SPEED} step={0.1} value={editor.draft.speed} disabled
          aria-valuetext={formatSpeed(editor.draft.speed)} onChange={(event) => editor.updateConfig({ speed: Number(event.target.value) })} />
        <div className="voice-speed-limits"><span>0.5x</span><span>1.0x mặc định</span><span>2.0x</span></div>
        <p className="voice-note">Máy chủ hiện hỗ trợ tốc độ đọc cố định 1.0x.</p>
      </Card>
      <Card className="voice-configuration"><h2>Cấu hình thuyết minh</h2>
        <dl><div><dt>Ngôn ngữ</dt><dd>{languageNames[editor.draft.languageCode]}</dd></div><div><dt>Giọng đọc</dt><dd>{editor.selectedVoice?.name ?? 'Chưa chọn'}</dd></div><div><dt>Tốc độ</dt><dd>{formatSpeed(editor.draft.speed)}</dd></div></dl>
        {editor.validationError && <p className="voice-error" role="status">{editor.validationError}</p>}
        <p role="status">{editor.status === 'SAVING' ? 'Đang lưu cấu hình...' : editor.dirty ? 'Có thay đổi chưa lưu' : editor.saved ? 'Đã lưu' : 'Chọn giọng đọc để cấu hình thuyết minh.'}</p>
        <div className="voice-actions"><Button variant="secondary" disabled={!editor.dirty || editor.busy} onClick={editor.reset}>Đặt lại thay đổi</Button>
          <Button loading={editor.status === 'SAVING'} disabled={!editor.canSave} onClick={editor.save}>Tạo giọng đọc</Button>
          <Button variant="secondary" disabled={!editor.saved || editor.dirty || editor.busy || Boolean(editor.validationError) || editor.status === 'FAILED'} onClick={() => { editor.stopPreview(); navigate('/projects/' + project.id + '/generate?language=' + target); }}>Tiếp tục tạo thuyết minh</Button></div>
        <p className="voice-note">Tạo giọng đọc sẽ gọi dịch vụ TTS sau khi bạn xác nhận.</p>
      </Card>
    </div>}
  </>;
}
