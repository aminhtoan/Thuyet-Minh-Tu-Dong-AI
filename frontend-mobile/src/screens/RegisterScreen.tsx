import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { RegisterForm } from '@/features/auth/RegisterForm';
import { colors, spacing, typography } from '@/theme/tokens';

export function RegisterScreen() {
  return <AuthLayout title="Create your account" description="Start building multilingual narration projects." footer={<View style={styles.footer}><Text style={styles.footerText}>Already have an account?</Text><Link href="/login" style={styles.link}>Sign in</Link></View>}><RegisterForm /></AuthLayout>;
}

const styles = StyleSheet.create({ footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }, footerText: { color: colors.textSecondary, fontSize: typography.size.sm }, link: { minHeight: 44, color: colors.primary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold } });
