import { Link } from 'react-router-dom'
import { LoginForm } from '../features/auth/LoginForm'
import '../styles/login.css'

function MuseumMark() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 9 9-6 9 6H3Zm2 3v6m5-6v6m4-6v6m5-6v6M3 21h18M3 18h18" /></svg>
}

export function LoginPlaceholder() {
  return <div className="login-page"><main className="login-museum">
    <section className="login-museum__form-panel" aria-labelledby="login-heading">
      <div className="login-museum__content">
        <div className="login-museum__brand"><span className="login-museum__brand-icon"><MuseumMark /></span><div className="login-museum__brand-copy"><span className="login-museum__brand-name">Thuyết minh bảo tàng</span><span className="login-museum__brand-tagline">NỀN TẢNG ĐA NGÔN NGỮ</span></div></div>
        <div className="login-museum__card">
          <header className="login-museum__heading"><h1 id="login-heading">Chào mừng trở lại</h1></header>
          <LoginForm />
          <footer className="login-museum__footer">Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></footer>
        </div>
      </div>
    </section>
    <section className="login-museum__photo" aria-label="Giới thiệu Thuyết minh bảo tàng">
      <img src="/museum/images/hero.jpg" alt="Mặt tiền Bảo tàng Chứng tích Chiến tranh và khu trưng bày ngoài trời" width="1960" height="1102" fetchPriority="high" />
      <div className="login-museum__message"><p className="login-museum__slogan">Kết nối lịch sử qua nhiều ngôn ngữ.</p><p>Ứng dụng AI hỗ trợ tạo và quản lý nội dung thuyết minh bảo tàng.</p></div>
    </section>
  </main></div>
}
