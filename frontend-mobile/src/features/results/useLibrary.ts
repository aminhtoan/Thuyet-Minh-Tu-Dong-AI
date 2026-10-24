import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { session } from '@/lib/api';
import { projectRepository } from '../projects/projectRepository';
import type { Project } from '../projects/types';
import { loadCompleteProjectList } from '../projects/projectListData';

export function useLibrary() {
  const revision = useSyncExternalStore(session.subscribe, session.getRevision, session.getRevision);
  const [state, setState] = useState<{ projects: Project[]; isLoading: boolean; error: string | null; revision: number }>({ projects: [], isLoading: true, error: null, revision });
  const pending = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const currentRevision = session.getRevision();
    setState({ projects: [], isLoading: true, error: null, revision: currentRevision });
    try {
      const projects = await loadCompleteProjectList(projectRepository.listPage, controller.signal);
      if (!controller.signal.aborted && currentRevision === session.getRevision()) setState({ projects, isLoading: false, error: null, revision: currentRevision });
      else if (!controller.signal.aborted) setState({ projects: [], isLoading: false, error: 'Phiên đăng nhập đã thay đổi. Vui lòng tải lại thư viện.', revision: session.getRevision() });
    } catch {
      if (!controller.signal.aborted) setState({ projects: [], isLoading: false, error: 'Không thể tải thư viện thuyết minh. Vui lòng kiểm tra kết nối và thử lại.', revision: session.getRevision() });
    }
  }, []);
  useFocusEffect(useCallback(() => {
    if (revision === session.getRevision() && session.getAuthStatus() === 'authenticated') void reload();
    return () => pending.current?.abort();
  }, [reload, revision]));
  // Old account data is never rendered while a new session's GET is pending.
  return { ...(state.revision === revision ? state : { projects: [], isLoading: true, error: null }), reload };
}
