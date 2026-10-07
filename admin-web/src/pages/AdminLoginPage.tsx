import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Icon } from '../components/common/Icon';
import { Badge } from '../components/common/Badge';
import { adminAuthService } from '../services/adminAuthService';
export function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = String(fields.get('email') ?? '').trim(); const password = String(fields.get('password') ?? '');
    if (!email || !password) { setError('Vui lòng nhập email và mật khẩu.'); return; }
    try { await adminAuthService.login(email, password); form.reset(); navigate('/dashboard', { replace: true }); }
    catch { setError('Không thể đăng nhập bằng tài khoản quản trị này.'); }
  }
  return <main className="login-page"><section className="login-brand"><div className="brand"><Icon name="wave" width="34" height="40" /><span>Người kể chuyện AI<small>Trang quản trị</small></span></div><div className="login-intro"><Badge tone="primary">ADMIN WORKSPACE</Badge><h1>Một góc nhìn.<br />Toàn bộ hệ thống.</h1><p>Không gian quản trị cho nền tảng thuyết minh đa ngôn ngữ.</p><div className="login-art" aria-hidden="true"><Icon name="wave" width="140" height="90" /><span /><span /><span /></div></div><small>Foundation S12 · React + TypeScript</small></section>
    <section className="login-form-area"><form className="login-form card" onSubmit={submit} noValidate><Badge tone="primary">ADMIN</Badge><h2>Đăng nhập quản trị</h2><p>Chỉ dành cho tài khoản quản trị.</p><div className="demo-notice">Tài khoản sẽ được xác thực an toàn qua backend.</div>
      <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="off" placeholder="admin@example.com" required aria-describedby={error ? 'login-error' : undefined} />
      <label htmlFor="password">Mật khẩu</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" required aria-describedby={error ? 'login-error' : undefined} />
      {error && <p id="login-error" role="alert" className="form-error">{error}</p>}<Button type="submit">Đăng nhập quản trị <Icon name="arrow" width="18" /></Button><small>Mật khẩu không được lưu trên trình duyệt.</small>
    </form></section></main>;
}
