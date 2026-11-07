import { useEffect, useState, useTransition } from 'react';
import { adminProjectService } from '../../services/adminProjectService';
import type { AdminNarration, AdminProject } from '../../types/operations';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { environment } from '../../config/env';
import { AdminDialog } from '../common/AdminDialog';

interface NarrationApprovalModalProps {
  project: AdminProject | null;
  onClose: () => void;
  onUpdated?: () => void;
}

const resolveAudioUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = environment.apiBaseUrl.replace(/\/api$/, '');
  const clean = url.startsWith('/') ? url : `/${url}`;
  return `${base}${clean}`;
};

const formatSeconds = (sec: number) => {
  if (!sec || isNaN(sec)) return '0:00';
  const mins = Math.floor(sec / 60);
  const remainder = Math.round(sec % 60);
  return `${mins}:${String(remainder).padStart(2, '0')}`;
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getLanguageBadge = (code: string) => {
  const c = code.toLowerCase();
  switch (c) {
    case 'vi': return { flag: '🇻🇳', label: 'Tiếng Việt' };
    case 'en': return { flag: '🇺🇸', label: 'Tiếng Anh' };
    case 'zh': return { flag: '🇨🇳', label: 'Tiếng Trung' };
    case 'ja': return { flag: '🇯🇵', label: 'Tiếng Nhật' };
    case 'ko': return { flag: '🇰🇷', label: 'Tiếng Hàn' };
    case 'fr': return { flag: '🇫🇷', label: 'Tiếng Pháp' };
    case 'de': return { flag: '🇩🇪', label: 'Tiếng Đức' };
    case 'es': return { flag: '🇪🇸', label: 'Tiếng Tây Ban Nha' };
    default: return { flag: '🌐', label: code.toUpperCase() };
  }
};

export function NarrationApprovalModal({ project, onClose, onUpdated }: NarrationApprovalModalProps) {
  const [narrations, setNarrations] = useState<AdminNarration[]>([]);
  const [loading, setLoading] = useState(Boolean(project?.id));
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [, startTransition] = useTransition();

  const loadData = async (projId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminProjectService.getProjectNarrations(projId);
      setNarrations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách âm thanh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!project?.id) return;

    adminProjectService
      .getProjectNarrations(project.id)
      .then((data) => {
        if (!cancelled) {
          setNarrations(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách âm thanh.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [project?.id]);

  if (!project) return null;

  const handleToggle = async (narrationId: string, currentApproved: boolean) => {
    const nextApproved = !currentApproved;
    setUpdatingId(narrationId);
    setFeedback(null);
    try {
      const updated = await adminProjectService.updateNarrationApproval(narrationId, nextApproved);
      startTransition(() => {
        setNarrations((prev) =>
          prev.map((n) => (n.id === narrationId ? { ...n, isApproved: updated.isApproved, approvedAt: updated.approvedAt } : n))
        );
      });
      setFeedback({
        id: narrationId,
        success: true,
        message: nextApproved ? 'Đã duyệt phát hành trên trang thuyết minh.' : 'Đã tạm ẩn khỏi trang thuyết minh.',
      });
      onUpdated?.();
    } catch (err) {
      setFeedback({
        id: narrationId,
        success: false,
        message: err instanceof Error ? err.message : 'Không thể cập nhật phê duyệt.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const approvedCount = narrations.filter((n) => n.isApproved).length;
  const totalCount = narrations.length;
  const availableLanguages = Array.from(new Set(narrations.map((n) => n.languageCode.toLowerCase())));
  const displayedNarrations = selectedLanguage === 'ALL'
    ? narrations
    : narrations.filter((n) => n.languageCode.toLowerCase() === selectedLanguage);

  return (
    <AdminDialog open={Boolean(project)} onClose={onClose} labelledBy="approval-title" className="project-approval-dialog">
      <div className="narration-modal">
        <header className="narration-modal__header">
          <div>
            <div className="narration-modal__eyebrow">
              <Icon name="wave" className="narration-modal__eyebrow-icon" />
              <span>Kiểm duyệt tệp âm thanh thuyết minh (MP3)</span>
            </div>
            <h2 id="approval-title" className="narration-modal__title">{project.name}</h2>
            <p className="narration-modal__subtitle">
              Mã dự án: <code>{project.id}</code> &bull; Khách hàng: <strong>{project.customerName}</strong>
            </p>
          </div>
          <button
            type="button"
            autoFocus
            className="narration-modal__close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <Icon name="close" />
          </button>
        </header>

        {!loading && availableLanguages.length > 1 && (
          <div className="narration-modal__lang-tabs" role="tablist" aria-label="Ngôn ngữ thuyết minh">
            <button
              type="button"
              role="tab"
              aria-selected={selectedLanguage === 'ALL'}
              className={`narration-modal__lang-tab ${selectedLanguage === 'ALL' ? 'narration-modal__lang-tab--active' : ''}`}
              onClick={() => setSelectedLanguage('ALL')}
            >
              <span>🌐 Tất cả</span>
              <span className="narration-modal__lang-tab-count">({narrations.length})</span>
            </button>
            {availableLanguages.map((code) => {
              const lang = getLanguageBadge(code);
              const items = narrations.filter((n) => n.languageCode.toLowerCase() === code);
              const allApproved = items.length > 0 && items.every((n) => n.isApproved);
              return (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  aria-selected={selectedLanguage === code}
                  className={`narration-modal__lang-tab ${selectedLanguage === code ? 'narration-modal__lang-tab--active' : ''}`}
                  onClick={() => setSelectedLanguage(code)}
                >
                  <span role="img" aria-label={lang.label}>{lang.flag}</span>
                  <span>{items[0]?.languageName || lang.label} ({code.toUpperCase()})</span>
                  <span className={`narration-modal__lang-pill ${allApproved ? 'narration-modal__lang-pill--approved' : 'narration-modal__lang-pill--pending'}`}>
                    {allApproved ? '✓ Đã duyệt' : '⏸ Chưa duyệt'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <section className="narration-modal__body">
          {loading ? (
            <div className="narration-modal__loading" role="status">
              <span className="narration-modal__spinner" aria-hidden="true" />
              <p>Đang tải danh sách các bản âm thanh thuyết minh...</p>
            </div>
          ) : error ? (
            <div className="narration-modal__error" role="alert">
              <Icon name="alert" />
              <p>{error}</p>
              <Button variant="secondary" onClick={() => loadData(project.id)}>Thử lại</Button>
            </div>
          ) : narrations.length === 0 ? (
            <div className="narration-modal__empty">
              <Icon name="voices" />
              <h4>Chưa có tệp âm thanh thuyết minh nào</h4>
              <p>Dự án này chưa hoàn thành tiến trình tạo giọng thuyết minh (TTS). Vui lòng kiểm tra lại sau khi tác vụ chuyển đổi hoàn tất.</p>
            </div>
          ) : (
            <div className="narration-modal__list">
              {displayedNarrations.map((n) => {
                const lang = getLanguageBadge(n.languageCode);
                const isPending = updatingId === n.id;
                const isItemApproved = n.isApproved;

                return (
                  <article
                    key={n.id}
                    className={`narration-item ${isItemApproved ? 'narration-item--approved' : 'narration-item--hidden'}`}
                  >
                    <div className="narration-item__header">
                      <div className="narration-item__language">
                        <span className="narration-item__flag" role="img" aria-label={lang.label}>
                          {lang.flag}
                        </span>
                        <div>
                          <strong>{n.languageName || lang.label}</strong>
                          <span className="narration-item__lang-code">({n.languageCode.toUpperCase()})</span>
                        </div>
                      </div>

                      <div className="narration-item__status">
                        {isItemApproved ? (
                          <Badge tone="success">✓ Đã duyệt phát hành</Badge>
                        ) : (
                          <Badge tone="warning">⏸ Tạm ẩn (Không phát hành)</Badge>
                        )}
                      </div>
                    </div>

                    <div className="narration-item__meta">
                      <div className="narration-item__meta-entry">
                        <span className="narration-item__meta-label">Giọng đọc</span>
                        <span className="narration-item__meta-value">{n.voiceName} ({n.voiceGender === 'FEMALE' ? 'Nữ' : n.voiceGender === 'MALE' ? 'Nam' : 'AI'})</span>
                      </div>
                      <div className="narration-item__meta-entry">
                        <span className="narration-item__meta-label">Thời lượng</span>
                        <span className="narration-item__meta-value">{formatSeconds(n.duration)}</span>
                      </div>
                      <div className="narration-item__meta-entry">
                        <span className="narration-item__meta-label">Dung lượng</span>
                        <span className="narration-item__meta-value">{formatFileSize(n.fileSize)}</span>
                      </div>
                      <div className="narration-item__meta-entry">
                        <span className="narration-item__meta-label">Tốc độ</span>
                        <span className="narration-item__meta-value">{n.speed || 1}x</span>
                      </div>
                    </div>

                    <div className="narration-item__player-row">
                      <audio
                        aria-label={`Nghe bản âm thanh ${n.languageName || lang.label}`}
                        controls
                        preload="none"
                        src={resolveAudioUrl(n.audioUrl)}
                        className="narration-item__audio-player"
                      >
                        Trình duyệt không hỗ trợ thẻ audio.
                      </audio>

                      <Button
                        aria-label={`${isItemApproved ? 'Tạm ẩn' : 'Duyệt phát hành'} âm thanh ${n.languageName || lang.label} của dự án ${project.name}`}
                        variant={isItemApproved ? 'secondary' : 'primary'}
                        onClick={() => handleToggle(n.id, isItemApproved)}
                        disabled={isPending}
                        className="narration-item__action-btn"
                      >
                        {isPending ? (
                          'Đang lưu...'
                        ) : isItemApproved ? (
                          'Tạm ẩn khỏi trang nghe'
                        ) : (
                          '✓ Duyệt phát hành'
                        )}
                      </Button>
                    </div>

                    {feedback?.id === n.id && (
                      <p role={feedback.success ? 'status' : 'alert'} className={`narration-item__feedback ${feedback.success ? 'narration-item__feedback--ok' : 'narration-item__feedback--err'}`}>
                        {feedback.message}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="narration-modal__footer">
          <div className="narration-modal__summary-stat">
            {!loading && narrations.length > 0 && (
              <span>
                Trạng thái: <strong>{approvedCount} / {totalCount}</strong> bản âm thanh được duyệt hiển thị trên trang hướng dẫn khách tham quan (BYOD / QR).
              </span>
            )}
          </div>
          <div className="narration-modal__footer-actions">
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </footer>
      </div>
    </AdminDialog>
  );
}
