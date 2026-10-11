import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { authService } from '../features/auth/authService';
import { confirmationMessages } from '../localization/confirmationMessages.mjs';

type User = { id: string; fullName: string; email: string; role: string };
export function SettingsPlaceholder() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const logoutLock = useRef(false);
  const navigate = useNavigate();
  useEffect(() => { let active = true; void authService.me().then((data) => { if (active) setUser(data.user); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải tài khoản.'); }); return () => { active = false; }; }, [loadAttempt]);
  function retryLoad() { setError(null); setUser(null); setLoadAttempt((attempt) => attempt + 1); }
  async function logout() { if (logoutLock.current || !window.confirm(confirmationMessages.logout)) return; logoutLock.current = true; setBusy(true); try { await authService.logout(); navigate('/login', { replace: true }); } catch { setError('Không thể đăng xuất. Vui lòng thử lại.'); setBusy(false); logoutLock.current = false; } }
  return <><PageHeader title="Tài khoản" description="Thông tin tài khoản đang đăng nhập và bảo mật phiên." /><Card padding="lg">{error ? <ErrorState title="Không thể tải tài khoản" description={error} onRetry={retryLoad} /> : !user ? <Spinner label="Đang tải tài khoản" /> : <><dl className="result-metadata"><div><dt>Họ tên</dt><dd>{user.fullName}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Vai trò</dt><dd>Khách hàng</dd></div></dl><Button loading={busy} disabled={busy} variant="secondary" onClick={() => void logout()}>{busy ? 'Đang đăng xuất...' : 'Đăng xuất'}</Button></>}</Card></>;
}
