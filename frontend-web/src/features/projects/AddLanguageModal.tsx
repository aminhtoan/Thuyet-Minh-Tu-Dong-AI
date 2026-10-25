import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { projectRepository } from './projectRepository';
import type { LanguageCode } from './types';

const SUPPORTED_LANGUAGES: Array<{ code: LanguageCode; name: string; flag: string }> = [
  { code: 'ja', name: 'Tiếng Nhật', flag: '🇯🇵' },
  { code: 'en', name: 'Tiếng Anh', flag: '🇬🇧' },
  { code: 'fr', name: 'Tiếng Pháp', flag: '🇫🇷' },
  { code: 'ko', name: 'Tiếng Hàn', flag: '🇰🇷' },
  { code: 'zh', name: 'Tiếng Trung', flag: '🇨🇳' },
];

export interface AddLanguageModalProps {
  projectId: string;
  projectName: string;
  existingLanguages?: string[];
  open: boolean;
  onClose: () => void;
}

export function AddLanguageModal({ projectId, projectName, existingLanguages = [], open, onClose }: AddLanguageModalProps) {
  const navigate = useNavigate();
  const availableChoices = SUPPORTED_LANGUAGES.filter(l => !existingLanguages.includes(l.code));
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(availableChoices[0]?.code ?? 'ja');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleConfirm() {
    if (!selectedLanguage || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { project: branched } = await projectRepository.branchLanguage(projectId, selectedLanguage);
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
            Tạo thêm bản thuyết minh bằng ngôn ngữ khác cho hiện vật <strong>"{projectName}"</strong>. 
            Toàn bộ tệp âm thanh và bản ghi gốc được kế thừa tự động.
          </p>
        </div>

        {error && <div className="field__message field__message--error" role="alert">{error}</div>}

        <div className="add-language-modal-body">
          <label htmlFor="add-language-select" className="add-language-label">
            Chọn ngôn ngữ bạn muốn bổ sung:
          </label>
          <select
            id="add-language-select"
            className="add-language-select"
            value={selectedLanguage}
            disabled={busy || !availableChoices.length}
            onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)}
          >
            {availableChoices.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name} ({lang.code.toUpperCase()})
              </option>
            ))}
          </select>
          {!availableChoices.length && (
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
            disabled={busy || !availableChoices.length}
            onClick={() => void handleConfirm()}
          >
            Bắt đầu dịch ngôn ngữ này
          </Button>
        </div>
      </Card>
    </div>
  );
}
