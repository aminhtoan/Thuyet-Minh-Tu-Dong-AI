// UI-only form validation. Not authentication, authorization or a session.
// Never retain credentials, issue tokens, call APIs or write browser storage.
export function validateMockAdminLogin(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Vui lòng nhập email hợp lệ.';
  if (!password.trim()) return 'Vui lòng nhập mật khẩu mô phỏng.';
  return null;
}
