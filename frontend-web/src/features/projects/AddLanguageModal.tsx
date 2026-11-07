import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { projectRepository } from './projectRepository';
import { voiceService } from '../voice/voiceService';
import type { LanguageCode } from './types';

type LangEntry = { code: string; name: string; nativeName: string };

// Flag emoji helper from BCP-47 region codes
function flagEmoji(code: string): string {
  const upper = code.slice(0, 2).toUpperCase();
  const flags: Record<string, string> = {
    VI: '🇻🇳', EN: '🇬🇧', JA: '🇯🇵', KO: '🇰🇷', ZH: '🇨🇳',
    FR: '🇫🇷', DE: '🇩🇪', ES: '🇪🇸', IT: '🇮🇹', PT: '🇵🇹',
    RU: '🇷🇺', NL: '🇳🇱', PL: '🇵🇱', TH: '🇹🇭', ID: '🇮🇩',
    MS: '🇲🇾', HI: '🇮🇳', AR: '🇸🇦', TR: '🇹🇷',
  };
  return flags[upper] ?? '🌐';
}

export interface AddLanguageModalProps {
  projectId: string;
  projectName: string;
  sourceLanguage?: string | null;
  existingLanguages?: string[];
  open: boolean;
  onClose: () => void;
}

export function AddLanguageModal({ projectId, projectName, sourceLanguage, existingLanguages = [], open, onClose }: AddLanguageModalProps) {
  const navigate = useNavigate();
  const [catalogLanguages, setCatalogLanguages] = useState<LangEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setCatalogLoading(true);
    voiceService.getLanguages({ signal: controller.signal })
      .then((langs) => {
        if (controller.signal.aborted) return;
        setCatalogLanguages(langs);
        setCatalogLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setCatalogLoading(false);
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách ngôn ngữ.');
      });
    return () => controller.abort();
  }, [open]);

  const availableChoices = catalogLanguages.filter((l) => {
    const code = (l.code || '').toLowerCase().trim();
    const name = (l.name || '').trim();
    if (code.startsWith('xx-') || /^[a-z]{2}-[a-f0-9]{6,8}$/i.test(code) || /^s2[0-9]\s/i.test(name) || /^test\s/i.test(name)) {
      return false;
    }
    return (!sourceLanguage || code !== sourceLanguage.toLowerCase())
      && !existingLanguages.map(e => e.toLowerCase()).includes(code);
  });

  // Auto-select first available when list changes
  useEffect(() => {
    if (availableChoices.length > 0 && !availableChoices.some((c) => c.code === selectedLanguage)) {
      setSelectedLanguage(availableChoices[0]!.code);
    }
  }, [availableChoices, selectedLanguage]);

  if (!open) return null;

  async function handleConfirm() {
    if (!selectedLanguage || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { project: branched } = await projectRepository.branchLanguage(projectId, selectedLanguage as LanguageCode);
      onClose();
      navigate(`/projects/${branched.id}/translation?language=${selectedLanguage}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo bản dịch mới.');
      setBusy(false);
    }
  }

  return (
    <div className="add-language-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-lang-title">
      <div className="add-language-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <Card className="add-language-modal-card">
        <div className="add-language-modal-header">
          <h2 id="add-lang-title">Thêm ngôn ngữ thuyết minh mới</h2>
          <p className="add-language-modal-desc">
            Tạo thêm bản thuyết minh bằng ngôn ngữ khác cho hiện vật <strong>"{projectName}"</strong>.{' '}
            Toàn bộ tệp âm thanh và bản ghi gốc được kế thừa tự động.
          </p>
        </div>

        {error && <div className="field__message field__message--error" role="alert">{error}</div>}

        <div className="add-language-modal-body">
          <label htmlFor="add-language-select" className="add-language-label">
            Chọn ngôn ngữ bạn muốn bổ sung:
          </label>
          {catalogLoading ? (
            <p className="translation-note">Đang tải danh sách ngôn ngữ…</p>
          ) : (
            <select
              id="add-language-select"
              className="add-language-select"
              value={selectedLanguage}
              disabled={busy || !availableChoices.length}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {availableChoices.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {flagEmoji(lang.code)} {lang.name} · {lang.nativeName} ({lang.code.toUpperCase()})
                </option>
              ))}
            </select>
          )}
          {!catalogLoading && !availableChoices.length && (
            <p className="translation-note">Hiện vật này đã có đủ tất cả các ngôn ngữ được hỗ trợ.</p>
          )}
        </div>

        <div className="add-language-modal-actions">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={busy || !availableChoices.length || catalogLoading}
            onClick={() => void handleConfirm()}
          >
            Bắt đầu dịch ngôn ngữ này
          </Button>
        </div>
      </Card>
    </div>
  );
}
