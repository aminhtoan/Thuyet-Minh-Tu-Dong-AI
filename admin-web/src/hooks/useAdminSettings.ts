import { useEffect, useState } from 'react';
import { adminSettingsService } from '../services/adminSettingsService';

export function useAdminSettings() {
  const [request, setRequest] = useState(0);
  const [state, setState] = useState<{ request: number; data: unknown; error: boolean }>({ request: -1, data: null, error: false });
  useEffect(() => {
    const controller = new AbortController();
    adminSettingsService.getSettings({ signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ request, data, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ request, data: null, error: true }); });
    return () => controller.abort();
  }, [request]);
  return { data: state.request === request ? state.data : null, loading: state.request !== request, error: state.request === request && state.error, retry: () => setRequest(value => value + 1) };
}
