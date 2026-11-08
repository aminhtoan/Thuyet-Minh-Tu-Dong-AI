import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { OperationProgress, OperationSkeleton } from '../components/operations/OperationsCommon';
import { useJob } from '../hooks/useOperations';
import { loadJobAudio } from '../services/adminJobAudio';

export function AdminJobDetailPage() {
  const { jobId = '' } = useParams();
  const { data: j, loading, error, retry } = useJob(jobId);
  const [playingJob, setPlayingJob] = useState<string | null>(null);
  const isPlaying = playingJob === jobId;
  const setIsPlaying = (playing: boolean) => setPlayingJob(playing ? jobId : null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const blobRef = useRef<string | null>(null);
  const [audioError, setAudioError] = useState('');
  useEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    blobRef.current = null;
  }, [jobId]);

  const toggleAudio = async () => {
    if (!audioRef.current || requestRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const controller = new AbortController();
      requestRef.current = controller;
      setAudioError('');
      try {
        if (!blobRef.current) {
          const blob = await loadJobAudio(jobId, controller.signal);
          if (controller.signal.aborted || !audioRef.current) return;
          blobRef.current = URL.createObjectURL(blob);
          audioRef.current.src = blobRef.current;
        }
        if (controller.signal.aborted) return;
        await audioRef.current.play();
        if (!controller.signal.aborted) setIsPlaying(true);
      } catch {
        if (!controller.signal.aborted) setAudioError('Không thể phát audio của công việc này.');
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    }
  };

  if (loading) return <OperationSkeleton />;
  if (error) {
    return (
      <Card>
        <EmptyState icon="alert" title="Không thể tải công việc" description="Vui lòng thử lại." />
        <Button onClick={retry}>Thử lại</Button>
      </Card>
    );
  }
  if (!j) {
    return (
      <Card>
        <EmptyState icon="jobs" title="Không tìm thấy công việc" description="Công việc không tồn tại." />
      </Card>
    );
  }

  const isTtsCompleted = j.type === 'TTS' && j.status === 'COMPLETED';

  return (
    <>
      <Link className="detail-back" to="/jobs">← Công việc xử lý</Link>
      <AdminPageHeader
        title={(j.id || jobId).toUpperCase()}
        description={j.type}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isTtsCompleted && (
              <>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={toggleAudio}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '36px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Bấm để phát hoặc dừng âm thanh thuyết minh"
                >
                  <span style={{ fontSize: '16px' }}>{isPlaying ? '⏸' : '🔊'}</span>
                  <span>{isPlaying ? 'Đang phát...' : 'Nghe'}</span>
                </button>
                <audio
                  ref={audioRef}
                  preload="none"
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  style={{ display: 'none' }}
                />
              </>
            )}
            <StatusBadge status={j.status} />
          </div>
        }
      />
      {audioError && <p role="alert">{audioError}</p>}

      <div className="operation-detail-grid">
        <Card>
          <h2>Thông tin công việc</h2>
          <dl className="profile-list">
            <div>
              <dt>Dự án</dt>
              <dd>{j.projectId ? <Link to={`/projects/${j.projectId}`}>{j.projectName}</Link> : j.projectName}</dd>
            </div>
            <div>
              <dt>Khách hàng</dt>
              <dd>{j.userId ? <Link to={`/users/${j.userId}`}>{j.customerName}</Link> : j.customerName}</dd>
            </div>
            <div>
              <dt>Loại</dt>
              <dd>{j.type}</dd>
            </div>
            <div>
              <dt>Ngôn ngữ đích</dt>
              <dd>{j.targetLanguage?.toUpperCase() ?? '—'}</dd>
            </div>
            <div>
              <dt>Tạo lúc</dt>
              <dd>{j.createdAt ? new Date(j.createdAt).toLocaleString('vi-VN') : '—'}</dd>
            </div>
            <div>
              <dt>Bắt đầu</dt>
              <dd>{j.startedAt ? new Date(j.startedAt).toLocaleString('vi-VN') : '—'}</dd>
            </div>
            <div>
              <dt>Hoàn thành</dt>
              <dd>{j.completedAt ? new Date(j.completedAt).toLocaleString('vi-VN') : '—'}</dd>
            </div>
            {isTtsCompleted && (
              <div>
                <dt>Âm thanh</dt>
                <dd>
                  <button
                    type="button"
                    onClick={toggleAudio}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{isPlaying ? '⏸' : '🔊'}</span>
                    <span>{isPlaying ? 'Tạm dừng âm thanh' : 'Bấm để nghe file MP3'}</span>
                  </button>
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h2>Tiến độ</h2>
          <OperationProgress prominent value={j.progress} label="Tiến độ công việc" />
          {j.errorMessage && <p role="alert" className="form-error">{j.errorMessage}</p>}
          <p className="muted" style={{ marginTop: '16px', fontSize: '13px' }}>
            Backend ghi nhận tự động tiến trình pipeline AI của hệ thống.
          </p>
        </Card>
      </div>
    </>
  );
}
