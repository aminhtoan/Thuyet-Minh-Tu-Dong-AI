import { useEffect, useState } from 'react';
import type { LanguageCode } from '../projects/types';
import { resultService } from './resultService';
import type { Result } from './types';
export function useResult(projectId: string, language?: LanguageCode) {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) { setLoading(true); setError(null); setResult(null); } });
    resultService.getByProjectId(projectId, language).then(value => {
      if (active) setResult(value);
    }).catch(() => { if (active) setError('Không tải được kết quả. Vui lòng thử lại.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, language, attempt]);
  return { result, loading, error, reload: () => setAttempt(value => value + 1) };
}
