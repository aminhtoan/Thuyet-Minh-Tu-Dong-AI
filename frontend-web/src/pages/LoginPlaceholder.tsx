import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { LoginForm } from '../features/auth/LoginForm'

export function LoginPlaceholder() {
  return <div className="login-page"><AuthLayout title="Đăng nhập" description="" footer={<>Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></>}><LoginForm /></AuthLayout></div>
}
