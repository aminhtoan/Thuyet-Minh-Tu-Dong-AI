import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { Icon } from '../components/common/Icon';
import { ProgressBar } from '../components/common/ProgressBar';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { WorkflowSteps } from '../components/common/WorkflowSteps';
import { ProjectStatusBadge } from '../features/projects/ProjectStatusBadge';
import { formatFileSize, MAX_MEDIA_FILE_SIZE, validateMediaFile, type UploadStatus } from '../features/projects/mediaUpload';
import { languages } from '../features/projects/languages';
import { projectAction } from '../features/projects/projectAction';
import { projectRepository } from '../features/projects/projectRepository';
import { projectMetadataState } from '../features/projects/projectDataState';
import { uploadMediaToProject } from '../features/projects/uploadService';
import { useProject } from '../features/projects/useProjects';
import '../styles/project-detail.css';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading, error } = useProject(projectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('vi');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const saveLock = useRef(false);
  const uploadLock = useRef(false);
  const uploadController = useRef<AbortController | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (project) {
      // Populate the editable draft after the async project detail arrives.
      // oxlint-disable-next-line react/set-state-in-effect
      setName(project.name); setDescription(project.description ?? ''); setSourceLanguage(project.sourceLanguage);
    }
  }, [project]);
  useEffect(() => () => uploadController.current?.abort(), []);
  if (isLoading) return <Card className="project-detail-load-state"><Spinner label="Đang tải dự án" /></Card>;
  if (error || !project || !projectId) return <Card className="project-detail-load-state"><ErrorState title="Không thể mở dự án" description={error ?? 'Dự án không tồn tại hoặc bạn không có quyền truy cập.'} /></Card>;
  const mediaState = projectMetadataState(project).media;
  const storedMediaName = mediaState === 'ERROR' ? 'Không tải được thông tin tệp' : mediaState === 'UNKNOWN' || mediaState === 'LOADING' ? 'Chưa xác định' : project.mediaName ?? 'Chưa tải lên';
  const storedMediaType = mediaState === 'ERROR' ? 'Không tải được thông tin' : mediaState === 'UNKNOWN' || mediaState === 'LOADING' ? 'Chưa xác định' : project.mediaType === 'VIDEO' ? 'Video' : project.mediaType === 'AUDIO' ? 'Âm thanh' : 'Chưa có tệp';
  const storedMediaSize = mediaState === 'ERROR' ? 'Không tải được thông tin' : mediaState === 'UNKNOWN' || mediaState === 'LOADING' ? 'Chưa xác định' : project.mediaSize ? formatFileSize(project.mediaSize) : 'Chưa có dữ liệu';
  const currentProject = project;
  const action = projectAction(project);
  const canResumeUpload = project.workflow?.step === 'UPLOAD' && project.workflow.state === 'READY' && project.workflow.canResume;
  const uploadValidation = validateMediaFile(uploadFile && { name: uploadFile.name, size: uploadFile.size, mimeType: uploadFile.type });
  const uploadBusy = uploadStatus === 'uploading';
  const trimmedName = name.trim();
  const validationError = !trimmedName ? 'Tên dự án là bắt buộc.' : description.trim().length > 1000 ? 'Mô tả không được vượt quá 1000 ký tự.' : null;
  async function submit(event: FormEvent) { event.preventDefault(); if (!projectId || validationError || saveLock.current || uploadBusy) { if (validationError) setMessage({ kind: 'error', text: validationError }); return; } saveLock.current = true; setSaving(true); setMessage(null); try { await projectRepository.updateProject(projectId, { name: trimmedName, description: description.trim(), sourceLanguage }); setMessage({ kind: 'success', text: 'Đã lưu thay đổi dự án.' }); } catch (reason) { setMessage({ kind: 'error', text: reason instanceof Error ? reason.message : 'Không thể cập nhật dự án.' }); } finally { saveLock.current = false; setSaving(false); } }
  async function remove() { if (!projectId || saving || uploadBusy || !window.confirm(`Xóa dự án “${currentProject.name}” và toàn bộ tệp liên quan? Thao tác này không thể hoàn tác.`)) return; setSaving(true); try { await projectRepository.deleteProject(projectId); navigate('/projects', { replace: true }); } catch (reason) { setMessage({ kind: 'error', text: reason instanceof Error ? reason.message : 'Không thể xóa dự án.' }); setSaving(false); } }
  function selectUploadFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!nextFile || uploadLock.current) return;
    setUploadFile(nextFile);
    setUploadStatus('selected');
    setUploadError(null);
  }
  function clearUploadFile() {
    if (uploadLock.current || uploadBusy) return;
    setUploadFile(null);
    setUploadStatus('idle');
    setUploadError(null);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }
  async function resumeUpload() {
    if (!projectId || !canResumeUpload || !uploadFile || !uploadValidation.valid || uploadLock.current) return;
    uploadLock.current = true;
    const controller = new AbortController();
    uploadController.current = controller;
    setUploadStatus('uploading');
    setUploadError(null);
    try {
      await uploadMediaToProject({ projectId, file: uploadFile, signal: controller.signal, onProgress: () => {} });
      if (!controller.signal.aborted) {
        setUploadStatus('success');
        void projectRepository.refresh().catch(() => {});
      }
    } catch (reason) {
      if (controller.signal.aborted) setUploadStatus('cancelled');
      else {
        setUploadStatus('failed');
        setUploadError(reason instanceof Error ? reason.message : 'Không thể tải phương tiện lên. Vui lòng thử lại.');
      }
    } finally {
      uploadLock.current = false;
      if (uploadController.current === controller) uploadController.current = null;
    }
  }
  function cancelUpload() { uploadController.current?.abort(); }
  return <><PageHeader title={project.name} description={project.description || 'Chưa có mô tả cho dự án này.'} actions={<div className="project-detail-header-actions"><ProjectStatusBadge status={project.status} /><Link className="button button--secondary button--md project-detail-back" to="/projects"><Icon name="arrow" width="16" />Quay lại dự án</Link></div>} />
    <div className="project-detail-layout">
      <Card padding="lg" className="project-detail-summary"><section aria-labelledby="workflow-heading"><div className="project-detail-section-heading"><span className="project-detail-section-icon" aria-hidden="true"><Icon name="sparkles" width="20" /></span><div><h2 id="workflow-heading">Tiến độ dự án</h2><p>Theo dõi các bước xử lý và tiếp tục khi dự án sẵn sàng.</p></div></div><WorkflowSteps workflow={project.workflow} projectId={project.id} pageStep="UPLOAD" />
        {project.workflow?.state === 'PROCESSING' && <div className="project-workflow-state" role="status"><strong>Dự án đang được xử lý.</strong><span>Vui lòng chờ bước hiện tại hoàn tất; trang này không tự tạo thêm tác vụ.</span>{project.workflow.processing && <ProgressBar value={project.workflow.processing.progress} label="Tiến độ xử lý" />}</div>}
        {project.workflow?.state === 'FAILED' && action.available && <div className="project-workflow-state project-workflow-state--error" role="alert"><strong>Bước hiện tại chưa hoàn tất.</strong><span>Bạn có thể mở đúng bước gặp lỗi để xem hướng dẫn và chủ động thử lại.</span></div>}
        {project.workflow?.state === 'COMPLETED' && <div className="project-workflow-state project-workflow-state--success" role="status"><strong>Dự án đã hoàn thành.</strong><span>Kết quả chỉ khả dụng khi Backend xác nhận artifact hợp lệ.</span></div>}
        {!action.available && <p className="project-workflow-warning" role="status"><strong>Chưa thể xác định bước tiếp theo.</strong> {action.reason} Bạn vẫn có thể xem và chỉnh sửa thông tin dự án.</p>}
      </section></Card>
      <div className="project-detail-content-grid">
      <Card padding="lg" className="project-detail-card"><section aria-labelledby="media-heading"><div className="project-detail-section-heading"><span className="project-detail-section-icon" aria-hidden="true"><Icon name={project.mediaType === 'VIDEO' ? 'video' : 'document'} width="20" /></span><div><h2 id="media-heading">Phương tiện nguồn</h2><p>Thông tin tệp được xác minh từ dữ liệu dự án.</p></div></div><dl className="project-media-grid" data-state={mediaState}><div><dt>Tên tệp</dt><dd>{uploadStatus === 'success' && uploadFile ? uploadFile.name : storedMediaName}</dd></div><div><dt>Loại</dt><dd>{uploadStatus === 'success' && uploadValidation.valid ? uploadValidation.mediaType === 'VIDEO' ? 'Video' : 'Âm thanh' : storedMediaType}</dd></div><div><dt>Dung lượng</dt><dd>{uploadStatus === 'success' && uploadFile ? formatFileSize(uploadFile.size) : storedMediaSize}</dd></div></dl>
        {mediaState === 'ERROR' && <p className="project-media-notice project-media-notice--error" role="alert">Không thể tải metadata phương tiện. Dữ liệu bên trên không được xem là xác nhận tệp đang trống.</p>}
        {(mediaState === 'UNKNOWN' || mediaState === 'LOADING') && <p className="project-media-notice" role="status">Metadata phương tiện chưa được xác minh đầy đủ.</p>}
        {canResumeUpload && <div className="project-resume-upload" aria-labelledby="resume-upload-heading"><div><h3 id="resume-upload-heading">Tiếp tục tải phương tiện</h3><p>Dự án nháp này đã được lưu. Tệp sẽ được tải lên đúng dự án hiện tại.</p></div>
          <input ref={uploadInputRef} className="visually-hidden" id="resume-media-file" type="file" accept=".mp4,.mov,.webm,.mp3,.wav,.m4a,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4" onChange={selectUploadFile} disabled={uploadStatus === 'uploading' || uploadStatus === 'success'} aria-describedby="resume-upload-hint" />
          <div className="project-resume-upload__picker-row"><Button type="button" variant="secondary" disabled={uploadStatus === 'uploading' || uploadStatus === 'success'} onClick={() => uploadInputRef.current?.click()}>{uploadFile ? 'Thay tệp' : 'Chọn tệp âm thanh hoặc video'}</Button>{uploadFile && uploadStatus !== 'success' && <Button type="button" variant="ghost" disabled={uploadBusy} onClick={clearUploadFile}>Xóa tệp đã chọn</Button>}</div>
          {uploadFile && <div className="project-resume-upload__file"><span className="project-resume-upload__file-icon" aria-hidden="true"><Icon name={uploadValidation.valid && uploadValidation.mediaType === 'VIDEO' ? 'video' : 'document'} width="20" /></span><strong>{uploadFile.name}</strong><span>{formatFileSize(uploadFile.size)}</span></div>}
          {uploadFile && !uploadValidation.valid && <p className="project-detail-message project-detail-message--error" role="alert">{uploadValidation.error}</p>}
          <p id="resume-upload-hint" className="project-resume-upload__hint">MP4, MOV, WEBM, MP3, WAV hoặc M4A · Tối đa {formatFileSize(MAX_MEDIA_FILE_SIZE)}</p>
          {uploadStatus === 'failed' && <p className="project-detail-message project-detail-message--error" role="alert">{uploadError}</p>}
          {uploadStatus === 'cancelled' && <p className="project-detail-message" role="status">Đã hủy tải lên. Tệp vẫn được chọn để bạn có thể thử lại.</p>}
          {uploadStatus === 'success' && <div className="project-resume-upload__success" role="status"><strong>Tải phương tiện thành công.</strong><Link className="button button--primary button--md" to={`/projects/${project.id}/transcript`}>Tiếp tục đến bản ghi</Link></div>}
          {uploadStatus !== 'success' && <div className="project-resume-upload__actions"><Button type="button" loading={uploadStatus === 'uploading'} disabled={!uploadFile || !uploadValidation.valid || uploadStatus === 'uploading'} onClick={() => void resumeUpload()}>{uploadStatus === 'failed' || uploadStatus === 'cancelled' ? 'Thử tải lại' : 'Tải lên dự án này'}</Button>{uploadStatus === 'uploading' && <Button type="button" variant="secondary" onClick={cancelUpload}>Hủy tải lên</Button>}</div>}
        </div>}
      </section></Card>
      <Card padding="lg" className="project-detail-card"><form className="project-detail-form" onSubmit={submit} noValidate>
        <div className="project-detail-section-heading"><span className="project-detail-section-icon" aria-hidden="true"><Icon name="projects" width="20" /></span><div><h2>Thông tin dự án</h2><p>Cập nhật tên, mô tả và ngôn ngữ của nội dung nguồn.</p></div></div>
        <div className="project-detail-field"><label htmlFor="project-detail-name">Tên dự án <span aria-hidden="true">*</span></label><input id="project-detail-name" value={name} maxLength={150} required aria-invalid={!trimmedName} aria-describedby={!trimmedName ? 'project-name-error' : undefined} onChange={(event) => setName(event.target.value)} disabled={saving || uploadBusy} />{!trimmedName && <span id="project-name-error" className="field__message field__message--error">Tên dự án là bắt buộc.</span>}</div>
        <div className="project-detail-field"><label htmlFor="project-detail-description">Mô tả</label><textarea id="project-detail-description" value={description} maxLength={1000} rows={4} onChange={(event) => setDescription(event.target.value)} disabled={saving || uploadBusy} /><span className="project-detail-field__hint">Không bắt buộc · {description.length}/1000 ký tự</span></div>
        <div className="project-detail-field"><label htmlFor="project-detail-language">Ngôn ngữ nguồn</label><select id="project-detail-language" value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)} disabled={saving || uploadBusy}>{languages.map((language) => <option key={language.code} value={language.code}>{language.nativeName}</option>)}</select></div>
        {message && <p className={`project-detail-message project-detail-message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
        <div className="project-detail-actions"><Button type="submit" loading={saving} disabled={saving || uploadBusy || Boolean(validationError)}>Lưu thay đổi</Button>{action.available && action.step !== 'upload' && <Link className="button button--secondary button--md" to={action.path}>{action.label}</Link>}<Button type="button" variant="danger" disabled={saving || uploadBusy} onClick={() => void remove()}>Xóa dự án</Button></div>
      </form></Card>
      </div>
    </div></>;
}
