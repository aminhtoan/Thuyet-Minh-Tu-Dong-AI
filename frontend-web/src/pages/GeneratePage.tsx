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
import { useProject } from '../features/projects/useProjects';
import { languageNames } from '../features/projects/projectUtils';
import type { LanguageCode, Project } from '../features/projects/types';
import { ProcessingStage } from '../features/processing/ProcessingStage';
import { getSimulatedProjectStatus } from '../features/processing/processingUtils';
import { useProcessing } from '../features/processing/useProcessing';
import { formatSpeed } from '../features/voice/voiceUtils';
import { getDisplayStatus } from '../utils/displayLabels';
import { processingStatusLabels } from '../localization/statusLabels.mjs';
import '../styles/processing.css';

export function GeneratePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const language = params.get('language');
  const { project, isLoading, error } = useProject(projectId);
  if (isLoading) return <Card><Spinner label="Đang tải dự án" /></Card>;
  if (error) return <Card><ErrorState title="Không thể tải dự án" description={error} /></Card>;
  if (!project || (language !== null && !isLanguageCode(language))) return <>
    <PageHeader title="Tạo thuyết minh" description="Kiểm tra cấu hình thuyết minh đã lưu." />
    <Card><ErrorState title={project ? 'Ngôn ngữ không khả dụng' : 'Không tìm thấy dự án'} description="Mở một cấu hình giọng đọc đã lưu để bắt đầu." />
      <Link className="button button--secondary button--md" to={project ? '/projects/' + project.id + '/voice' : '/projects'}>Quay lại {project ? 'cấu hình giọng đọc' : 'danh sách dự án'}</Link>
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
  const failedStage = snapshot?.error?.stage === 'start' ? 'Bắt đầu tạo' : snapshot?.stages.find((stage) => stage.id === snapshot?.error?.stage)?.title;
  return <>
    <PageHeader title="Tạo thuyết minh" description="Kiểm tra cấu hình trước khi bắt đầu xử lý."
      actions={<Button variant="secondary" disabled={busy} onClick={() => edit('voice')}>Quay lại cấu hình giọng đọc</Button>} />
    <div className="generation-heading"><h2>{project.name}</h2><Badge variant={snapshot?.status === 'COMPLETED' ? 'success' : snapshot?.status === 'FAILED' ? 'error' : 'info'}>{snapshot ? processingStatusLabels[snapshot.status] : 'Đang tải'}</Badge></div>
    <WorkflowSteps current="generate" />
    {processing.loadStatus === 'LOADING' && <Card className="processing-loading"><Spinner label="Đang tải cấu hình tạo thuyết minh" /><p role="status">Đang tải cấu hình đã lưu...</p></Card>}
    {processing.loadStatus === 'FAILED' && <Card><ErrorState title="Không thể tải cấu hình tạo thuyết minh" description={processing.error ?? 'Vui lòng thử lại.'} onRetry={processing.reload} /></Card>}
    {processing.loadStatus === 'READY' && !context && <Card><EmptyState title="Cần lưu cấu hình giọng đọc"
      description="Hãy lưu bản dịch, giọng đọc và tốc độ đọc hợp lệ trước khi tạo."
      action={<Button onClick={() => edit('voice')}>Quay lại cấu hình giọng đọc</Button>} /></Card>}
    {context && snapshot && <div className="generation-layout">
      <Card className="generation-summary"><h2>Tóm tắt cấu hình</h2>
        <dl>
          <div><dt>Dự án</dt><dd>{context.project.name}</dd></div>
          <div><dt>Ngôn ngữ nguồn</dt><dd>{languageNames[context.transcript.languageCode]}</dd></div>
          <div><dt>Ngôn ngữ đích</dt><dd>{languageNames[context.translation.targetLanguage]}</dd></div>
          <div><dt>Bản ghi</dt><dd>{context.transcript.segments.length} phân đoạn</dd></div>
          <div><dt>Bản dịch</dt><dd>{'groups' in context.translation ? `${context.translation.groups.length} cụm đã duyệt` : `${context.translation.segments.length} phân đoạn`}</dd></div>
          <div><dt>Giọng đọc</dt><dd>{context.voice.name}</dd></div>
          <div><dt>Tốc độ đọc</dt><dd>{formatSpeed(context.config.speed)}</dd></div>
          <div><dt>Phương tiện</dt><dd>{context.project.mediaName ?? 'Phương tiện đã lưu'} ({context.project.mediaType === 'VIDEO' ? 'video' : 'âm thanh'})</dd></div>
        </dl>
        <div className="generation-actions"><Button variant="secondary" disabled={busy} onClick={() => edit('translation')}>Chỉnh sửa bản dịch</Button>
          <Button variant="secondary" disabled={busy} onClick={() => edit('voice')}>Chỉnh sửa giọng đọc</Button></div>
        <p className="processing-note">Dự án video sẽ được ghép với âm thanh thuyết minh bằng FFmpeg. Dự án âm thanh dùng trực tiếp tệp giọng đọc đã tạo.</p>
        {snapshot.status === 'WAITING' && <>
          <label className="generation-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />Tôi đã kiểm tra ngôn ngữ, giọng đọc và tốc độ đọc.</label>
          <Button disabled={!confirmed} onClick={processing.start}>{project.mediaType === 'VIDEO' ? 'Tạo video' : 'Tạo âm thanh'}</Button>
        </>}
      </Card>
      <Card className="processing-panel">
        <div className="processing-panel__heading"><h2>{snapshot.status === 'COMPLETED' ? 'Xử lý hoàn tất' : snapshot.status === 'FAILED' ? 'Xử lý thất bại' : snapshot.status === 'CANCELLED' ? 'Đã hủy xử lý' : 'Quy trình xử lý'}</h2>
          <Badge variant={snapshot.status === 'COMPLETED' ? 'success' : snapshot.status === 'FAILED' ? 'error' : 'info'}>{processingStatusLabels[snapshot.status]}</Badge></div>
        <p className="processing-note">Trạng thái dự án: {getDisplayStatus(getSimulatedProjectStatus(snapshot, project.mediaType ?? 'AUDIO'))}</p>
        <ProgressBar value={snapshot.progress} label="Tiến độ xử lý tổng thể" />
        <p className="processing-message" role="status">{snapshot.message}</p>
        <ol className="processing-stages" aria-label="Các giai đoạn xử lý">{snapshot.stages.map((stage) => <ProcessingStage key={stage.id} stage={stage} />)}</ol>
        {busy && <p className="processing-note">Hãy giữ trang này mở trong khi máy chủ xử lý. Đóng trang không hủy tác vụ phía máy chủ.</p>}
        {snapshot.status === 'FAILED' && <div className="processing-outcome" role="alert"><h3>Xử lý thất bại</h3>
          <p>Giai đoạn: {failedStage ?? 'Tạo thuyết minh'}</p><p>{snapshot.error?.message}</p>
          <Button onClick={processing.retry}>Thử xử lý lại</Button><p className="processing-note">Thử lại sẽ khởi động hai giai đoạn từ 0%.</p></div>}
        {snapshot.status === 'COMPLETED' && <div className="processing-outcome"><h3>Đã hoàn tất xử lý</h3><p>Tệp kết quả đã sẵn sàng để phát và tải xuống.</p>
          <Button onClick={() => navigate('/projects/' + project.id + '/result?language=' + target)}>Xem kết quả</Button></div>}
      </Card>
    </div>}
  </>;
}
