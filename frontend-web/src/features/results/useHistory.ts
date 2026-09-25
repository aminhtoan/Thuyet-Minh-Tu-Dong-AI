import { useEffect, useState } from 'react';
import { useProjects } from '../projects/useProjects';
import { resultService } from './resultService';
import type { HistoryItem } from './types';
export function useHistory() {
  const { projects: source } = useProjects();
  const [projects, setProjects] = useState<HistoryItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) { setLoading(true); setError(null); } });
    resultService.getHistory().then(value => { if (active) setProjects(value); })
      .catch(() => { if (active) setError('Không tải được lịch sử.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [source, attempt]);
  return { projects, isLoading, error, reload: () => setAttempt(value => value + 1) };
}
