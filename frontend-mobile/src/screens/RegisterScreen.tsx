import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthFooter } from '@/features/auth/AuthFooter';
import { RegisterForm } from '@/features/auth/RegisterForm';

export function RegisterScreen() {
  return <AuthLayout title="Tạo tài khoản" description="Bắt đầu xây dựng dự án thuyết minh đa ngôn ngữ." footer={<AuthFooter prompt="Đã có tài khoản?" label="Đăng nhập" href="/login" />}><RegisterForm /></AuthLayout>;
}
