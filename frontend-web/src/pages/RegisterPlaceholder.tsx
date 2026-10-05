import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { RegisterForm } from '../features/auth/RegisterForm'

export function RegisterPlaceholder() {
  return <AuthLayout title="Tạo tài khoản" description="Bắt đầu xây dựng dự án thuyết minh đa ngôn ngữ." footer={<>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></>}><RegisterForm /></AuthLayout>
}
