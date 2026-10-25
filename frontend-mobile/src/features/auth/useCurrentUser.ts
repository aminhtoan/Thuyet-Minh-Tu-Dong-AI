import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { session } from '@/lib/api';
import { authService, type AuthUser } from './authService';

export const PROFILE_REQUEST_TIMEOUT_MS = 15_000;

export function useCurrentUser() {
  const revision = useSyncExternalStore(session.subscribe, session.getRevision, session.getRevision);
  const status = useSyncExternalStore(session.subscribe, session.getAuthStatus, session.getAuthStatus);
  const [state, setState] = useState<{ user: AuthUser | null; loading: boolean; error: string; revision: number }>({ user: null, loading: true, error: '', revision });
  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    const request = ++sequence.current, currentRevision = session.getRevision();
    setState({ user: null, loading: true, error: '', revision: currentRevision });
    if (session.getAuthStatus() !== 'authenticated') { setState({ user: null, loading: false, error: '', revision: currentRevision }); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('PROFILE_REQUEST_TIMEOUT')); }, PROFILE_REQUEST_TIMEOUT_MS);
      });
      const { user } = await Promise.race([authService.me(controller.signal), deadline]);
      if (request === sequence.current && currentRevision === session.getRevision()) {
        if (user.role !== 'CUSTOMER') throw new Error('CUSTOMER_REQUIRED');
        setState({ user, loading: false, error: '', revision: currentRevision });
      } else if (request === sequence.current) setState({ user: null, loading: false, error: 'Phiên đăng nhập đã thay đổi. Vui lòng tải lại thông tin tài khoản.', revision: session.getRevision() });
    } catch (cause) { if (request === sequence.current && currentRevision === session.getRevision()) setState({ user: null, loading: false, error: controller.signal.aborted || cause instanceof Error && cause.message === 'PROFILE_REQUEST_TIMEOUT' ? 'Tải thông tin tài khoản quá thời gian chờ. Vui lòng thử lại.' : 'Không thể tải thông tin tài khoản.', revision: currentRevision }); }
    finally { clearTimeout(timer); }
  }, []);
  useFocusEffect(useCallback(() => { if (status === 'authenticated' && revision === session.getRevision()) void reload(); return () => { sequence.current++; pending.current?.abort(); }; }, [status, revision, reload]));
  return { ...(status === 'authenticated' && revision === state.revision ? state : { user: null, loading: status === 'loading', error: '', revision }), status, reload };
}
