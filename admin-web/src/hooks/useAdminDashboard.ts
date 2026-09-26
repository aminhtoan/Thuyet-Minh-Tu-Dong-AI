import { useEffect, useState } from 'react';
import { adminDashboardService } from '../services/adminDashboardService';
import type { AdminDashboardData } from '../types/dashboard';
export function useAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    adminDashboardService.getDashboard({ signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) { setData(value); setLoading(false); }
    }).catch(() => {
      if (!controller.signal.aborted) { setError(true); setData(null); setLoading(false); }
    });
    return () => controller.abort();
  }, [request]);
  function refresh() {
    if (loading) return;
    setError(false); setLoading(true); setRequest(value => value + 1);
  }
  return { data, loading, error, refresh };
}
