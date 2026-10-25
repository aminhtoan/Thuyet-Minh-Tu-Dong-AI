import { useEffect, useRef, useState } from 'react';
import { adminDashboardService } from '../services/adminDashboardService';
import type { AdminDashboardData } from '../types/dashboard';
export function useAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [request, setRequest] = useState(0);
  const pending = useRef(true);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    adminDashboardService.getDashboard({ signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) { setData(value); setError(false); setLoading(false); pending.current = false; }
    }).catch(() => {
      if (!controller.signal.aborted) { setError(true); setData(null); setLoading(false); pending.current = false; }
    });
    return () => controller.abort();
  }, [request]);
  function refresh() {
    if (pending.current) return;
    pending.current = true;
    active.current?.abort();
    setError(false); setLoading(true); setRequest(value => value + 1);
  }
  return { data, loading, error, refresh };
}
