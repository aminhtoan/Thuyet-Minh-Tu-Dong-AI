import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { adminAuthService } from '../services/adminAuthService';
import { environment } from '../config/env';
import '../styles/admin-login.css';
export function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const navigate = useNavigate();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = String(fields.get('email') ?? '').trim(); const password = String(fields.get('password') ?? '');
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      (form.elements.namedItem(!email ? 'email' : 'password') as HTMLInputElement | null)?.focus();
      return;
    }
    submitting.current = true; setLoading(true); setError(null);
    try { await adminAuthService.login(email, password); form.reset(); navigate('/dashboard', { replace: true }); }
    catch { setError('Không thể đăng nhập bằng tài khoản quản trị này.'); }
    finally { submitting.current = false; setLoading(false); }
  }
  return <main className="admin-login">
    <section className="admin-login__panel" aria-labelledby="admin-login-heading">
      <div className="admin-login__content">
        <a className="admin-login__brand" href={environment.publicMuseumUrl} aria-label="Thuyết minh bảo tàng — Trang chủ bảo tàng">
          <span className="admin-login__mark"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 9 9-6 9 6H3Zm2 3v6m5-6v6m4-6v6m5-6v6M3 21h18M3 18h18" /></svg></span>
          <span><strong>Thuyết minh bảo tàng</strong><small>NỀN TẢNG ĐA NGÔN NGỮ</small></span>
        </a>
        <form className="admin-login__card" onSubmit={submit} noValidate aria-busy={loading}>
          <header><span className="admin-login__eyebrow">Dành cho quản trị viên</span><h1 id="admin-login-heading">Đăng nhập quản trị</h1><p>Đăng nhập để quản lý hệ thống thuyết minh bảo tàng.</p></header>
          <div className="admin-login__field"><label htmlFor="email">Email <span aria-hidden="true">*</span></label>
            <input id="email" name="email" type="email" autoComplete="username" placeholder="Nhập email quản trị" required disabled={loading} aria-describedby={error ? 'login-error' : undefined} /></div>
          <div className="admin-login__field"><label htmlFor="password">Mật khẩu <span aria-hidden="true">*</span></label>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" required disabled={loading} aria-describedby={error ? 'login-error' : undefined} /></div>
          {error && <p id="login-error" role="alert" className="admin-login__error">{error}</p>}
          <Button type="submit" disabled={loading} aria-busy={loading}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập quản trị'}</Button>
          <p className="admin-login__note">Chỉ dành cho tài khoản có quyền quản trị.</p>
        </form>
      </div>
    </section>
    <section className="admin-login__photo" aria-label="Giới thiệu Thuyết minh bảo tàng">
      <div className="admin-login__message"><p className="admin-login__slogan">Kết nối lịch sử qua nhiều ngôn ngữ.</p><p>Ứng dụng AI hỗ trợ tạo và quản lý nội dung thuyết minh bảo tàng.</p></div>
    </section>
  </main>;
}
