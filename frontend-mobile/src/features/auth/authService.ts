import { api, session } from '../../lib/api';
import type { LoginFormValues, RegisterFormValues } from './types';
import { projectRepository } from '../projects/projectRepository';
export type AuthUser = { id: string; role: 'CUSTOMER'|'ADMIN'; fullName: string; email: string };
type AuthData = { user: AuthUser; accessToken: string; refreshToken: string };

export const authService = {
  async login(values: LoginFormValues): Promise<void> { const data = await api<AuthData>('/auth/login', { method: 'POST', body: JSON.stringify(values) }); if (data.user.role !== 'CUSTOMER') throw new Error('CUSTOMER_REQUIRED'); projectRepository.clearSessionCache(); await session.set(data); },
  async register(values: RegisterFormValues): Promise<void> { await api<AuthData>('/auth/register', { method: 'POST', body: JSON.stringify({ fullName: values.fullName, email: values.email, password: values.password }) }); },
  async me(signal?: AbortSignal) { return api<{ user: AuthData['user'] }>('/auth/me', { signal }); },
  async logout() {
    const refreshToken = (await session.get())?.refreshToken;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try { if (refreshToken) await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }), signal: controller.signal }, false); }
    finally { clearTimeout(timer); projectRepository.clearSessionCache(); await session.clear(); }
  },
};
