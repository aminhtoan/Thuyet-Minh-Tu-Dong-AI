import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { RegisterForm } from '@/features/auth/RegisterForm';
import { colors, spacing, typography } from '@/theme/tokens';

export function RegisterScreen() {
  return <AuthLayout title="Tạo tài khoản" description="Bắt đầu xây dựng dự án thuyết minh đa ngôn ngữ." footer={<View style={styles.footer}><Text style={styles.footerText}>Đã có tài khoản?</Text><Link href="/login" style={styles.link}>Đăng nhập</Link></View>}><RegisterForm /></AuthLayout>;
}

const styles = StyleSheet.create({ footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }, footerText: { color: colors.textSecondary, fontSize: typography.size.sm }, link: { minHeight: 44, color: colors.primary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold } });
