import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { WorkflowSteps } from '../components/common/WorkflowSteps';
import { PageHeader } from '../components/layout/PageHeader';
import { useProject } from '../features/projects/useProjects';
import { isLanguageCode } from '../features/projects/languages';
import { useResult } from '../features/results/useResult';
import { resultRows } from '../features/results/resultUtils';
import '../styles/results.css';

export function ResultPage() {
  const { projectId = '' } = useParams();
  const [params] = useSearchParams();
  const language = params.get('language');
  const { project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const selectedLanguage = language && isLanguageCode(language) ? language : undefined;
  const { result, mediaUrl, loading, error, reload } = useResult(projectId, selectedLanguage);
  const valid = language === null || isLanguageCode(language);
  return <><PageHeader title="Kết quả" description="Xem và tải tệp thuyết minh do máy chủ tạo." />
    {projectLoading ? <Spinner label="Đang tải dự án" /> : projectError ? <ErrorState title="Không thể tải dự án" description={projectError} /> : !project || !valid ? <Card><ErrorState title={!project ? 'Không tìm thấy dự án' : 'Ngôn ngữ không khả dụng'} description="Vui lòng mở dự án từ danh sách." /></Card> : loading ? <Spinner label="Đang tải kết quả" /> : error ? <ErrorState title="Không tải được kết quả" description={error} onRetry={reload} /> : !result ? <Card><h2>Kết quả chưa sẵn sàng</h2><p>Dự án chưa có tệp kết quả cho ngôn ngữ này.</p><Link to={'/projects/' + projectId + '/generate' + (language ? '?language=' + language : '')}>Tiếp tục xử lý</Link></Card> : <>
      <WorkflowSteps current="result" />
      <div className="result-layout"><Card><div className="result-heading"><div><h2>{project.name}</h2><p>TỆP KẾT QUẢ · Dữ liệu thực từ máy chủ</p></div><Badge variant="success">Hoàn thành</Badge></div><dl className="result-metadata">{resultRows(project, result).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3>Tóm tắt xử lý</h3><p>Tạo giọng đọc: Hoàn thành</p><p>{result.artifactType === 'VIDEO' ? 'Ghép video: Hoàn thành' : 'Âm thanh thuyết minh: Sẵn sàng'}</p></Card>
      <Card><div className="result-preview"><h2>Xem trước {result.mediaType === 'VIDEO' ? 'video' : 'âm thanh'}</h2>{mediaUrl ? result.artifactType === 'VIDEO' ? <video controls src={mediaUrl} aria-label="Phát video kết quả được bảo vệ" /> : <audio controls src={mediaUrl} aria-label="Phát âm thanh kết quả được bảo vệ" /> : <Spinner label="Đang tải tệp kết quả được bảo vệ" />}</div>{mediaUrl && <a className="button button--primary button--md" href={mediaUrl} download={`${project.name}.${result.artifactType === 'VIDEO' ? 'mp4' : 'mp3'}`}>Tải xuống {result.mediaType === 'VIDEO' ? 'video' : 'âm thanh'}</a>}</Card></div>
    </>}
    <div className="result-actions"><Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link><Link className="button button--primary button--md" to="/history">Xem lịch sử</Link></div>
  </>;
}
