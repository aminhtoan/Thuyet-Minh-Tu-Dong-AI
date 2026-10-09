import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { session, type AuthStatus } from '../../lib/api';

const AuthContext = createContext<AuthStatus>('loading');

export function AuthBoundary({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(session.subscribe, session.getAuthStatus, session.getAuthStatus);

  useEffect(() => {
    void session.initialize();
  }, []);

  return <AuthContext.Provider value={status}>{children}</AuthContext.Provider>;
}

export function useAuthStatus() {
  return useContext(AuthContext);
}
