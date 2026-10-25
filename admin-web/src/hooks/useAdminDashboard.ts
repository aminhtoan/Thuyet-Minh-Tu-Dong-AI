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
  function refresh(silent = false) {
    if (pending.current) return;
    pending.current = true;
    active.current?.abort();
    if (!silent) {
      setError(false);
      setLoading(true);
    }
    setRequest(value => value + 1);
  }
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const interval = setInterval(() => {
      if (!document.hidden && !pending.current) {
        refresh(true);
      }
    }, 5000);
    const onFocus = () => {
      if (!pending.current) refresh(true);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  return { data, loading, error, refresh: () => refresh(false) };
}
