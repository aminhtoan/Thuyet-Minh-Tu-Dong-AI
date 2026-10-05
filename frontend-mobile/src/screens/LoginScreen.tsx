import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginForm } from '@/features/auth/LoginForm';
import { colors, spacing, typography } from '@/theme/tokens';

export function LoginScreen() {
  return <AuthLayout title="Chào mừng trở lại" description="Đăng nhập để tiếp tục không gian thuyết minh của bạn." footer={<View style={styles.footer}><Text style={styles.footerText}>Chưa có tài khoản?</Text><Link href="/register" style={styles.link}>Tạo tài khoản</Link></View>}><LoginForm /></AuthLayout>;
}

const styles = StyleSheet.create({ footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }, footerText: { color: colors.textSecondary, fontSize: typography.size.sm }, link: { minHeight: 44, color: colors.primary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold } });
