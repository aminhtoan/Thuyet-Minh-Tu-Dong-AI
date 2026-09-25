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
  return <><PageHeader title="Result" description="Kết quả mô phỏng — chưa có media thực." />
    {!project || !valid ? <Card><ErrorState title={!project ? 'Project not found' : 'Language unavailable'} description="Vui lòng mở dự án từ danh sách." /></Card> : loading ? <Spinner label="Loading result" /> : error ? <ErrorState title="Không tải được kết quả" description={error} onRetry={reload} /> : !result ? <Card><h2>Result not ready</h2><p>Dự án chưa hoàn tất mô phỏng cho ngôn ngữ này.</p><Link to={'/projects/' + projectId + '/generate' + (language ? '?language=' + language : '')}>Continue processing</Link></Card> : <>
      <WorkflowSteps current="result" />
      <div className="result-layout"><Card><h2>{project.name}</h2><p>MOCK_PREVIEW · Metadata ready</p><dl className="result-metadata">{resultRows(project, result).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3>Processing Summary</h3><p>Narration generation: Completed (simulated)</p><p>{result.mediaType === 'VIDEO' ? 'Video' : 'Audio'} processing: Completed (simulated)</p></Card>
      <Card><div className="result-preview"><h2>{result.mediaType === 'VIDEO' ? 'Video' : 'Audio'} Preview</h2><p>Preview chưa khả dụng</p><p>Mô phỏng không tạo file. Đây không phải media gốc hay kết quả có thể phát.</p></div><p id="download-reason">{downloadUnavailable}</p><Button disabled aria-describedby="download-reason">Download {result.mediaType === 'VIDEO' ? 'Video' : 'Audio'}</Button></Card></div>
    </>}
    <div className="result-actions"><Link className="button button--secondary button--md" to="/projects">Back to Projects</Link><Link className="button button--primary button--md" to="/history">View History</Link></div>
  </>;
}
