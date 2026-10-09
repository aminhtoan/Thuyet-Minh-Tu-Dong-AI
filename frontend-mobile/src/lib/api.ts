import * as SecureStore from 'expo-secure-store';
import { env } from '../config/env';
import { createSessionRevision } from '../features/auth/sessionRevision.mjs';
type Envelope<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };
type Tokens = { accessToken: string; refreshToken: string }; const key = 'customer-session'; let refreshPromise: Promise<boolean> | null = null;
export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';
let authStatus: AuthStatus = 'loading';
let initialization: Promise<void> | null = null;
const sessionRevision = createSessionRevision();
let sessionMutation: Promise<void> = Promise.resolve();
const authListeners = new Set<() => void>();

function updateAuthStatus(nextStatus: AuthStatus) {
  if (authStatus === nextStatus) return;
  authStatus = nextStatus;
  authListeners.forEach((listener) => listener());
}

export class ApiError extends Error { constructor(public readonly code: string, message: string, public readonly status: number) { super(message); } }

function enqueueSessionMutation(operation: () => Promise<void>) {
  const result = sessionMutation.then(operation, operation);
  sessionMutation = result.catch(() => undefined);
  return result;
}

export const session = {
  async get(): Promise<Tokens | null> { try { const raw = await SecureStore.getItemAsync(key); return raw ? JSON.parse(raw) as Tokens : null; } catch { return null; } },
  set(tokens: Tokens) {
    const revision = sessionRevision.advance();
    return enqueueSessionMutation(async () => {
      if (!sessionRevision.isCurrent(revision)) return;
      await SecureStore.setItemAsync(key, JSON.stringify(tokens));
      if (sessionRevision.isCurrent(revision)) updateAuthStatus('authenticated');
    });
  },
  clear() {
    const revision = sessionRevision.advance();
    return enqueueSessionMutation(async () => {
      if (!sessionRevision.isCurrent(revision)) return;
      await SecureStore.deleteItemAsync(key);
      if (sessionRevision.isCurrent(revision)) updateAuthStatus('unauthenticated');
    });
  },
  replaceIfCurrent(tokens: Tokens, revision: number) {
    return enqueueSessionMutation(async () => {
      if (!sessionRevision.isCurrent(revision)) return;
      await SecureStore.setItemAsync(key, JSON.stringify(tokens));
      if (sessionRevision.isCurrent(revision)) updateAuthStatus('authenticated');
    }).then(() => sessionRevision.isCurrent(revision));
  },
  clearIfCurrent(revision: number) {
    if (!sessionRevision.isCurrent(revision)) return Promise.resolve(false);
    const nextRevision = sessionRevision.advance();
    return enqueueSessionMutation(async () => {
      if (!sessionRevision.isCurrent(nextRevision)) return;
      await SecureStore.deleteItemAsync(key);
      if (sessionRevision.isCurrent(nextRevision)) updateAuthStatus('unauthenticated');
    }).then(() => sessionRevision.isCurrent(nextRevision));
  },
  getRevision() { return sessionRevision.current(); },
  initialize() {
    initialization ??= session.get()
      .then((tokens) => updateAuthStatus(tokens?.accessToken ? 'authenticated' : 'unauthenticated'))
      .catch(() => updateAuthStatus('unauthenticated'));
    return initialization;
  },
  subscribe(listener: () => void) { authListeners.add(listener); return () => authListeners.delete(listener); },
  getAuthStatus() { return authStatus; },
};
async function rotate() { const revision = session.getRevision(); const refreshToken = (await session.get())?.refreshToken; if (!refreshToken || revision !== session.getRevision()) return false; const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }) }); if (!response.ok) { await session.clearIfCurrent(revision); return false; } const body = await response.json() as Envelope<Tokens>; if (!body.success) { await session.clearIfCurrent(revision); return false; } return session.replaceIfCurrent(body.data, revision); }
export async function refreshSession() { refreshPromise ??= rotate().finally(() => { refreshPromise = null; }); return refreshPromise; }
export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> { const tokens = await session.get(); const headers = new Headers(init.headers); if (tokens?.accessToken) headers.set('authorization', `Bearer ${tokens.accessToken}`); if (init.body && !(init.body instanceof FormData)) headers.set('content-type', 'application/json'); const response = await fetch(`${env.apiBaseUrl}${path}`, { ...init, headers }); if (response.status === 401 && retry && tokens?.refreshToken) { if (await refreshSession()) return api<T>(path, init, false); } const body = await response.json() as Envelope<T>; if (!body.success) throw new ApiError(body.error.code, body.error.message, response.status); return body.data; }
