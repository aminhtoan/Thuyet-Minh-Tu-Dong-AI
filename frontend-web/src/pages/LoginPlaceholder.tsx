import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { LoginForm } from '../features/auth/LoginForm'

export function LoginPlaceholder() {
  return <AuthLayout title="Chào mừng trở lại" description="Đăng nhập để tiếp tục làm việc với dự án thuyết minh." footer={<>Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></>}><LoginForm /></AuthLayout>
}
