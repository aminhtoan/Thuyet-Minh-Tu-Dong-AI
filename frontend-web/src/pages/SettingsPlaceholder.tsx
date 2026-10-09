import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { authService } from '../features/auth/authService';

type User = { id: string; fullName: string; email: string; role: string };
export function SettingsPlaceholder() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { void authService.me().then((data) => setUser(data.user)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Không thể tải tài khoản.')); }, []);
  async function logout() { setBusy(true); try { await authService.logout(); navigate('/login', { replace: true }); } catch { setError('Không thể đăng xuất. Vui lòng thử lại.'); setBusy(false); } }
  return <><PageHeader title="Cài đặt" description="Thông tin tài khoản Customer đang đăng nhập." /><Card padding="lg">{error ? <ErrorState title="Không thể tải tài khoản" description={error} /> : !user ? <Spinner label="Đang tải tài khoản" /> : <><dl className="result-metadata"><div><dt>Họ tên</dt><dd>{user.fullName}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Vai trò</dt><dd>{user.role}</dd></div></dl><Button loading={busy} variant="secondary" onClick={() => void logout()}>Đăng xuất</Button></>}</Card></>;
}
