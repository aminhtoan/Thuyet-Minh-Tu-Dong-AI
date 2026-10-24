import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { projectRepository } from './projectRepository';
import { loadDashboardDataset } from './dashboardData';
import type { Project } from './types';

export function useDashboardProjects() {
  const [state, setState] = useState<{ projects: readonly Project[]; complete: boolean; isLoading: boolean; error: string | null }>({ projects: [], complete: false, isLoading: true, error: null });
  const pending = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setState(current => ({ ...current, complete: false, isLoading: true, error: null }));
    try {
      const data = await loadDashboardDataset(projectRepository.listPage, controller.signal);
      if (!controller.signal.aborted) setState({ projects: data.projects, complete: data.complete, isLoading: false, error: null });
    } catch {
      if (!controller.signal.aborted) setState({ projects: [], complete: false, isLoading: false, error: 'Không thể tải bảng điều khiển. Vui lòng kiểm tra kết nối và thử lại.' });
    }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); return () => pending.current?.abort(); }, [reload]));
  return { ...state, reload };
}
