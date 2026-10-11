import { api, session } from '../../lib/api'
import type { LoginFormValues, RegisterFormValues } from './types'
import { publishProfileUpdate } from './profileUpdate.mjs'
type AuthData = { user: { id: string; role: 'CUSTOMER'|'ADMIN'; fullName: string; email: string }; accessToken: string; refreshToken: string }

export const authService = {
  async login(values: LoginFormValues): Promise<void> { const data = await api<AuthData>('/auth/login', { method: 'POST', body: JSON.stringify(values) }); if (data.user.role !== 'CUSTOMER') throw new Error('CUSTOMER_REQUIRED'); session.set(data) },
  async register(values: RegisterFormValues): Promise<void> { await api<AuthData>('/auth/register', { method: 'POST', body: JSON.stringify({ fullName: values.fullName, email: values.email, password: values.password }) }) },
  async me() { return api<{ user: AuthData['user'] }>('/auth/me') },
  async updateName(fullName: string) { const data = await api<{ user: AuthData['user'] }>('/auth/me', { method: 'PATCH', body: JSON.stringify({ fullName }) }); publishProfileUpdate(data.user); return data.user },
  async logout() { const refreshToken = session.get()?.refreshToken; try { if (refreshToken) await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false) } finally { session.clear() } },
}
