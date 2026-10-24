import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/lib/api';
import { projectRepository } from './projectRepository';
import { loadCompleteProjectList } from './projectListData';
import type { Project } from './types';

export function useCompleteProjectList() {
  const [state, setState] = useState<{ projects: readonly Project[]; isLoading: boolean; error: string | null }>({ projects: [], isLoading: true, error: null });
  const pending = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setState({ projects: [], isLoading: true, error: null });
    try {
      const projects = await loadCompleteProjectList(projectRepository.listPage, controller.signal);
      if (!controller.signal.aborted) setState({ projects, isLoading: false, error: null });
    } catch (cause) {
      const error = cause instanceof ApiError && cause.status === 401 ? 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.' : 'Không tải được danh sách dự án đầy đủ. Vui lòng thử lại; không có thao tác xử lý dự án nào được gửi.';
      if (!controller.signal.aborted) setState({ projects: [], isLoading: false, error });
    }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); return () => pending.current?.abort(); }, [reload]));
  return { ...state, reload };
}
