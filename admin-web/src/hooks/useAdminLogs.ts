import { useEffect, useState } from 'react';
import { adminLogService } from '../services/adminLogService';

type Query = Omit<NonNullable<Parameters<typeof adminLogService.getLogs>[0]>, 'signal'>;
type Result = Awaited<ReturnType<typeof adminLogService.getLogs>>;

export function useAdminLogs(query: Query) {
  const [request, setRequest] = useState(0);
  const [state, setState] = useState<{ key: string; data: Result | null; error: boolean }>({ key: '', data: null, error: false });
  const { search, category, role, days, page, limit } = query ?? {};
  const key = JSON.stringify([search, category, role, days, page, limit, request]);
  useEffect(() => {
    const controller = new AbortController();
    adminLogService.getLogs({ search, category, role, days, page, limit, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ key, data, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ key, data: null, error: true }); });
    return () => controller.abort();
  }, [key, search, category, role, days, page, limit]);
  return { data: state.key === key ? state.data : null, loading: state.key !== key, error: state.key === key && state.error, retry: () => setRequest(value => value + 1) };
}
