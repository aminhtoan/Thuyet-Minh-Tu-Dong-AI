import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { WorkflowSteps } from '../components/common/WorkflowSteps';
import { PageHeader } from '../components/layout/PageHeader';
import { projectRepository } from '../features/projects/projectRepository';
import { isLanguageCode } from '../features/projects/languages';
import { useResult } from '../features/results/useResult';
import { resultRows } from '../features/results/resultUtils';
import { downloadUnavailable } from '../features/results/resultService';
import '../styles/results.css';

export function ResultPage() {
  const { projectId = '' } = useParams();
  const [params] = useSearchParams();
  const language = params.get('language');
  const project = projectRepository.getById(projectId);
  const { result, loading, error, reload } = useResult(projectId, isLanguageCode(language ?? '') ? language as 'vi' | 'en' | 'ja' | 'ko' : undefined);
  const valid = language === null || isLanguageCode(language);
  return <><PageHeader title="Kết quả" description="Kết quả mô phỏng — chưa có phương tiện thực." />
    {!project || !valid ? <Card><ErrorState title={!project ? 'Không tìm thấy dự án' : 'Ngôn ngữ không khả dụng'} description="Vui lòng mở dự án từ danh sách." /></Card> : loading ? <Spinner label="Đang tải kết quả" /> : error ? <ErrorState title="Không tải được kết quả" description={error} onRetry={reload} /> : !result ? <Card><h2>Kết quả chưa sẵn sàng</h2><p>Dự án chưa hoàn tất mô phỏng cho ngôn ngữ này.</p><Link to={'/projects/' + projectId + '/generate' + (language ? '?language=' + language : '')}>Tiếp tục xử lý</Link></Card> : <>
      <WorkflowSteps current="result" />
      <div className="result-layout"><Card><h2>{project.name}</h2><p>XEM TRƯỚC MÔ PHỎNG · Siêu dữ liệu đã sẵn sàng</p><dl className="result-metadata">{resultRows(project, result).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3>Tóm tắt xử lý</h3><p>Tạo thuyết minh: Hoàn thành (mô phỏng)</p><p>Xử lý {result.mediaType === 'VIDEO' ? 'video' : 'âm thanh'}: Hoàn thành (mô phỏng)</p></Card>
      <Card><div className="result-preview"><h2>Xem trước {result.mediaType === 'VIDEO' ? 'video' : 'âm thanh'}</h2><p>Bản xem trước chưa khả dụng</p><p>Mô phỏng không tạo tệp. Đây không phải phương tiện gốc hay kết quả có thể phát.</p></div><p id="download-reason">{downloadUnavailable}</p><Button disabled aria-describedby="download-reason">Tải xuống {result.mediaType === 'VIDEO' ? 'video' : 'âm thanh'}</Button></Card></div>
    </>}
    <div className="result-actions"><Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link><Link className="button button--primary button--md" to="/history">Xem lịch sử</Link></div>
  </>;
}
