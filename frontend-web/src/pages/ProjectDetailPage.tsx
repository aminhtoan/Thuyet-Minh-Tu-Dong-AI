import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { WorkflowSteps } from '../components/common/WorkflowSteps';
import { ProjectStatusBadge } from '../features/projects/ProjectStatusBadge';
import { formatFileSize } from '../features/projects/mediaUpload';
import { languages } from '../features/projects/languages';
import { projectAction } from '../features/projects/projectAction';
import { projectRepository } from '../features/projects/projectRepository';
import { useProject } from '../features/projects/useProjects';
import type { ProjectStatus } from '../features/projects/types';
import '../styles/project-detail.css';

function workflowStep(status: ProjectStatus): 'transcript' | 'translation' | 'voice' | 'generate' | 'result' {
  if (status === 'COMPLETED') return 'result';
  if (status === 'TRANSLATED') return 'voice';
  if (status === 'TRANSCRIBED' || status === 'TRANSLATING') return 'translation';
  if (status === 'GENERATING_AUDIO' || status === 'PROCESSING_VIDEO' || status === 'FAILED') return 'generate';
  return 'transcript';
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading, error } = useProject(projectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('vi');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const saveLock = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (project) {
      // Populate the editable draft after the async project detail arrives.
      // oxlint-disable-next-line react/set-state-in-effect
      setName(project.name); setDescription(project.description ?? ''); setSourceLanguage(project.sourceLanguage);
    }
  }, [project]);
  if (isLoading) return <Card><Spinner label="Đang tải dự án" /></Card>;
  if (error || !project || !projectId) return <Card><ErrorState title="Không thể mở dự án" description={error ?? 'Dự án không tồn tại hoặc bạn không có quyền truy cập.'} /></Card>;
  const currentProject = project;
  const action = projectAction(project);
  const trimmedName = name.trim();
  const validationError = !trimmedName ? 'Tên dự án là bắt buộc.' : description.trim().length > 1000 ? 'Mô tả không được vượt quá 1000 ký tự.' : null;
  async function submit(event: FormEvent) { event.preventDefault(); if (!projectId || validationError || saveLock.current) { if (validationError) setMessage({ kind: 'error', text: validationError }); return; } saveLock.current = true; setSaving(true); setMessage(null); try { await projectRepository.updateProject(projectId, { name: trimmedName, description: description.trim(), sourceLanguage }); setMessage({ kind: 'success', text: 'Đã lưu thay đổi dự án.' }); } catch (reason) { setMessage({ kind: 'error', text: reason instanceof Error ? reason.message : 'Không thể cập nhật dự án.' }); } finally { saveLock.current = false; setSaving(false); } }
  async function remove() { if (!projectId || saving || !window.confirm(`Xóa dự án “${currentProject.name}” và toàn bộ tệp liên quan? Thao tác này không thể hoàn tác.`)) return; setSaving(true); try { await projectRepository.deleteProject(projectId); navigate('/projects', { replace: true }); } catch (reason) { setMessage({ kind: 'error', text: reason instanceof Error ? reason.message : 'Không thể xóa dự án.' }); setSaving(false); } }
  return <><PageHeader title="Chi tiết dự án" description="Xem và cập nhật thông tin dự án." actions={<Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link>} />
    <div className="project-detail-layout">
      <Card padding="lg" className="project-detail-summary"><div className="project-detail-heading"><div><span className="project-detail-eyebrow">DỰ ÁN</span><h2>{project.name}</h2><p>{project.description || 'Chưa có mô tả.'}</p></div><ProjectStatusBadge status={project.status} /></div><WorkflowSteps current={workflowStep(project.status)} /></Card>
      <Card padding="lg"><section aria-labelledby="media-heading"><h2 id="media-heading">Phương tiện nguồn</h2><dl className="project-media-grid"><div><dt>Tên tệp</dt><dd>{project.mediaName ?? 'Chưa tải lên'}</dd></div><div><dt>Loại</dt><dd>{project.mediaType === 'VIDEO' ? 'Video' : project.mediaType === 'AUDIO' ? 'Âm thanh' : 'Chưa xác định'}</dd></div><div><dt>Dung lượng</dt><dd>{project.mediaSize ? formatFileSize(project.mediaSize) : 'Chưa có dữ liệu'}</dd></div></dl></section></Card>
      <Card padding="lg"><form className="auth-form" onSubmit={submit} noValidate>
        <h2>Chỉnh sửa thông tin</h2>
        <label>Tên dự án<input value={name} maxLength={150} required aria-invalid={!trimmedName} aria-describedby={!trimmedName ? 'project-name-error' : undefined} onChange={(event) => setName(event.target.value)} disabled={saving} />{!trimmedName && <span id="project-name-error" className="field__message field__message--error">Tên dự án là bắt buộc.</span>}</label>
        <label>Mô tả<textarea value={description} maxLength={1000} rows={4} onChange={(event) => setDescription(event.target.value)} disabled={saving} /></label>
        <label>Ngôn ngữ nguồn<select value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)} disabled={saving}>{languages.map((language) => <option key={language.code} value={language.code}>{language.nativeName}</option>)}</select></label>
        {message && <p className={`project-detail-message project-detail-message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
        <div className="voice-actions"><Button type="submit" loading={saving} disabled={saving || Boolean(validationError)}>Lưu thay đổi</Button><Link className="button button--secondary button--md" to={`/projects/${project.id}/${action.step}${project.targetLanguage ? `?language=${project.targetLanguage}` : ''}`}>{action.label}</Link><Button type="button" variant="danger" disabled={saving} onClick={() => void remove()}>Xóa dự án</Button></div>
      </form></Card>
    </div></>;
}
