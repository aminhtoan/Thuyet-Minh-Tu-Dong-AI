import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { languages } from '../features/projects/languages';
import { projectAction } from '../features/projects/projectAction';
import { projectRepository } from '../features/projects/projectRepository';
import { useProject } from '../features/projects/useProjects';
import { getProjectStatusLabel } from '../features/projects/projectUtils';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading, error } = useProject(projectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('vi');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
  async function submit(event: FormEvent) { event.preventDefault(); if (!projectId || !name.trim()) return; setSaving(true); setFormError(null); try { await projectRepository.updateProject(projectId, { name: name.trim(), description: description.trim(), sourceLanguage }); } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Không thể cập nhật dự án.'); } finally { setSaving(false); } }
  async function remove() { if (!projectId || !window.confirm(`Xóa dự án “${currentProject.name}” và toàn bộ tệp liên quan? Thao tác này không thể hoàn tác.`)) return; setSaving(true); try { await projectRepository.deleteProject(projectId); navigate('/projects', { replace: true }); } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Không thể xóa dự án.'); setSaving(false); } }
  return <><PageHeader title="Chi tiết dự án" description="Xem và cập nhật thông tin dự án." actions={<Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link>} />
    <Card padding="lg"><form className="auth-form" onSubmit={submit}>
      <label>Tên dự án<input value={name} maxLength={150} required onChange={(event) => setName(event.target.value)} /></label>
      <label>Mô tả<textarea value={description} maxLength={1000} rows={4} onChange={(event) => setDescription(event.target.value)} /></label>
      <label>Ngôn ngữ nguồn<select value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)}>{languages.map((language) => <option key={language.code} value={language.code}>{language.nativeName}</option>)}</select></label>
      <p>Trạng thái: {getProjectStatusLabel(project.status)} · Phương tiện: {project.mediaName ?? 'Chưa tải lên'}</p>
      {formError && <p role="alert">{formError}</p>}
      <div className="voice-actions"><Button type="submit" loading={saving}>Lưu thay đổi</Button><Link className="button button--secondary button--md" to={`/projects/${project.id}/${action.step}${project.targetLanguage ? `?language=${project.targetLanguage}` : ''}`}>Tiếp tục quy trình</Link><Button type="button" variant="secondary" disabled={saving} onClick={() => void remove()}>Xóa dự án</Button></div>
    </form></Card></>;
}
