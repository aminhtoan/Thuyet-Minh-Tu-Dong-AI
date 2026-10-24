import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthFooter } from '@/features/auth/AuthFooter';
import { LoginForm } from '@/features/auth/LoginForm';

export function LoginScreen() {
  return <AuthLayout title="Chào mừng trở lại" description="Đăng nhập để tiếp tục không gian thuyết minh của bạn." footer={<AuthFooter prompt="Chưa có tài khoản?" label="Tạo tài khoản" href="/register" />}><LoginForm /></AuthLayout>;
}
