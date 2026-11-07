import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { WorkflowSteps } from '../components/common/WorkflowSteps';
import { WorkflowRouteRecovery } from '../components/common/WorkflowRouteGuard';
import { PageHeader } from '../components/layout/PageHeader';
import { useProject } from '../features/projects/useProjects';
import { resolveWorkflowRouteAccess } from '../features/projects/workflowRouteGuard';
import type { Project } from '../features/projects/types';
import { useResult } from '../features/results/useResult';
import { resultRows } from '../features/results/resultUtils';
import { resultService, type LanguageVariant } from '../features/results/resultService';
import { AddLanguageModal } from '../features/projects/AddLanguageModal';
import '../styles/results.css';

export function ResultPage() {
  const { projectId = '' } = useParams();
  const [params] = useSearchParams();
  const language = params.get('language');
  const { project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  return <><PageHeader title="Kết quả" description="Xem và tải tệp thuyết minh do máy chủ tạo." />
    {projectLoading ? <Spinner label="Đang tải dự án" /> : projectError ? <ErrorState title="Không thể tải dự án" description={projectError} /> : !project ? <Card><ErrorState title="Không tìm thấy dự án" description="Dự án không tồn tại hoặc bạn không có quyền truy cập." /></Card> : <GuardedResult project={project} language={language} />}
    <div className="result-actions"><Link className="button button--secondary button--md" to="/projects">Quay lại dự án</Link><Link className="button button--primary button--md" to="/history">Xem thư viện</Link></div>
  </>;
}

function GuardedResult({ project, language }: { project: Project; language: string | null }) {
  const access = resolveWorkflowRouteAccess(project.workflow, 'RESULT', language);
  if (!access.allowed) return <WorkflowRouteRecovery projectId={project.id} access={access} />;
  return <ResultWorkspace project={project} language={access.targetLanguage ?? undefined} />;
}

function ResultWorkspace({ project, language }: { project: Project; language?: string }) {
  const navigate = useNavigate();
  const { result, mediaUrl, loading, error, reload } = useResult(project.id, language);
  const [variants, setVariants] = useState<LanguageVariant[]>([]);
  const [addLanguageModalOpen, setAddLanguageModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void resultService.getLanguageVariants(project.id, language).then((items) => {
      if (active) setVariants(items);
    });
    return () => {
      active = false;
    };
  }, [project.id, language]);

  const renderLanguageBar = () => (
    <div className="result-language-bar">
      <div className="result-language-tabs" role="tablist" aria-label="Các ngôn ngữ thuyết minh">
        {variants.map((v) => {
          const isActive = v.projectId === project.id && (!language || v.language === language);
          return (
            <button
              key={v.language}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`result-language-tab${isActive ? ' result-language-tab--active' : ''}`}
              onClick={() => {
                if (isActive) return;
                if (v.hasResult) {
                  navigate(`/projects/${v.projectId}/result?language=${v.language}`);
                } else {
                  navigate(`/projects/${v.projectId}/translation?language=${v.language}`);
                }
              }}
            >
              <span>{v.flag}</span>
              <span>{v.name}</span>
              {v.hasResult && <span className="result-tab-dot" title="Đã có bản thuyết minh" />}
            </button>
          );
        })}
      </div>
      <Button
        variant="secondary"
        className="result-add-language-btn"
        onClick={() => setAddLanguageModalOpen(true)}
      >
        + Thêm ngôn ngữ thuyết minh mới
      </Button>
    </div>
  );

  if (loading) return <Spinner label="Đang tải kết quả" />;
  if (error) return <ErrorState title="Không tải được kết quả" description={error} onRetry={reload} />;
  if (!result) {
    return (
      <>
        <WorkflowSteps workflow={project.workflow} projectId={project.id} pageStep="RESULT" />
        {renderLanguageBar()}
        <Card>
          <h2>Kết quả chưa sẵn sàng</h2>
          <p>Máy chủ chưa trả về tệp kết quả đã được xác nhận cho ngôn ngữ này.</p>
          <div style={{ marginBlockStart: '16px' }}>
            <Button
              variant="primary"
              onClick={() => navigate(`/projects/${project.id}/translation?language=${language ?? 'en'}`)}
            >
              Tiếp tục quy trình dịch và tạo giọng đọc
            </Button>
          </div>
        </Card>
        <AddLanguageModal
          open={addLanguageModalOpen}
          projectId={project.id}
          projectName={project.name}
          sourceLanguage={project.sourceLanguage}
          existingLanguages={[...(project.sourceLanguage ? [project.sourceLanguage] : []), ...variants.map((v) => v.language)]}
          onClose={() => setAddLanguageModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <WorkflowSteps workflow={project.workflow} projectId={project.id} pageStep="RESULT" />
      {renderLanguageBar()}
      <div className="result-layout">
        <Card>
          <div className="result-heading">
            <div>
              <h2>{project.name}</h2>
              <p>TỆP KẾT QUẢ · Dữ liệu thực từ máy chủ</p>
            </div>
            <Badge variant="success">Hoàn thành</Badge>
          </div>
          <dl className="result-metadata">
            {resultRows(project, result).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          <div className="result-summary-box">
            <h3>Tóm tắt quy trình xử lý</h3>
            <p>✓ Tạo giọng đọc: Hoàn thành</p>
            <p>✓ {result.artifactType === 'VIDEO' ? 'Ghép video: Hoàn thành' : 'Âm thanh thuyết minh: Sẵn sàng'}</p>
          </div>
        </Card>

        <Card className="result-media-card">
          <div className="result-media-card__header">
            <div>
              <span className="result-media-card__badge">
                {result.mediaType === 'VIDEO' ? '🎬 Video thuyết minh' : '🎙️ Bản thu âm hoàn chỉnh'}
              </span>
              <h2>Xem trước {result.mediaType === 'VIDEO' ? 'video' : 'âm thanh'}</h2>
            </div>
            <span className="result-media-card__format">{result.artifactType === 'VIDEO' ? 'MP4' : 'MP3'}</span>
          </div>

          {result.mediaType === 'AUDIO' ? (
            <div className="result-audio-player-container">
              <div className="result-audio-visual">
                <div className="result-audio-icon-wrap" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                </div>
                <div className="result-waveform-bars" aria-hidden="true">
                  <span style={{ height: '35%' }} />
                  <span style={{ height: '65%' }} />
                  <span style={{ height: '90%' }} />
                  <span style={{ height: '45%' }} />
                  <span style={{ height: '75%' }} />
                  <span style={{ height: '100%' }} />
                  <span style={{ height: '60%' }} />
                  <span style={{ height: '85%' }} />
                  <span style={{ height: '40%' }} />
                  <span style={{ height: '70%' }} />
                  <span style={{ height: '95%' }} />
                  <span style={{ height: '55%' }} />
                  <span style={{ height: '80%' }} />
                  <span style={{ height: '30%' }} />
                </div>
                <div className="result-audio-status">
                  <span className="result-status-dot" aria-hidden="true" />
                  <span>Sẵn sàng phát · Chất lượng cao</span>
                </div>
              </div>

              <div className="result-audio-controls-wrap">
                {mediaUrl ? (
                  <audio controls src={mediaUrl} aria-label="Phát âm thanh kết quả được bảo vệ" className="result-native-audio" />
                ) : (
                  <Spinner label="Đang tải tệp kết quả..." />
                )}
              </div>
            </div>
          ) : (
            <div className="result-video-player-container">
              {mediaUrl ? (
                <video controls src={mediaUrl} aria-label="Phát video kết quả được bảo vệ" className="result-native-video" />
              ) : (
                <Spinner label="Đang tải video kết quả..." />
              )}
            </div>
          )}

          <div className="result-download-footer">
            {mediaUrl && (
              <a
                className="button button--primary button--md result-download-btn"
                href={mediaUrl}
                download={`${project.name}.${result.artifactType === 'VIDEO' ? 'mp4' : 'mp3'}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Tải xuống tệp {result.mediaType === 'VIDEO' ? 'video (MP4)' : 'âm thanh (MP3)'}
              </a>
            )}
          </div>
        </Card>
      </div>
      <AddLanguageModal
        open={addLanguageModalOpen}
        projectId={project.id}
        projectName={project.name}
        sourceLanguage={project.sourceLanguage}
        existingLanguages={[...(project.sourceLanguage ? [project.sourceLanguage] : []), ...variants.map((v) => v.language)]}
        onClose={() => setAddLanguageModalOpen(false)}
      />
    </>
  );
}
