import { api, session } from '../../lib/api';
import type { LoginFormValues, RegisterFormValues } from './types';
type AuthData = { user: { id: string; role: 'CUSTOMER'|'ADMIN'; fullName: string; email: string }; accessToken: string; refreshToken: string };

export const authService = {
  async login(values: LoginFormValues): Promise<void> { const data = await api<AuthData>('/auth/login', { method: 'POST', body: JSON.stringify(values) }); if (data.user.role !== 'CUSTOMER') throw new Error('CUSTOMER_REQUIRED'); await session.set(data); },
  async register(values: RegisterFormValues): Promise<void> { await api<AuthData>('/auth/register', { method: 'POST', body: JSON.stringify({ fullName: values.fullName, email: values.email, password: values.password }) }); },
  async me() { return api<{ user: AuthData['user'] }>('/auth/me'); },
  async logout() { const refreshToken = (await session.get())?.refreshToken; try { if (refreshToken) await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false); } finally { await session.clear(); } },
};
