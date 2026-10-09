import { useEffect, useState } from 'react';
import type { LanguageCode } from '../projects/types';
import { resultService } from './resultService';
import type { Result } from './types';
export function useResult(projectId: string, language?: LanguageCode) {
  const [result, setResult] = useState<Result | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) { setLoading(true); setError(null); setResult(null); } });
    let objectUrl: string | null = null;
    resultService.getByProjectId(projectId, language).then(async value => {
      if (!active) return;
      setResult(value);
      if (value) { objectUrl = URL.createObjectURL(await resultService.getFile(value)); if (active) setMediaUrl(objectUrl); }
    }).catch(() => { if (active) setError('Không tải được kết quả. Vui lòng thử lại.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [projectId, language, attempt]);
  return { result, mediaUrl, loading, error, reload: () => setAttempt(value => value + 1) };
}
