import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { RegisterForm } from '../features/auth/RegisterForm'

export function RegisterPlaceholder() {
  return <div className="register-page"><AuthLayout title="Đăng ký" description="" footer={<>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></>}><RegisterForm /></AuthLayout></div>
}
