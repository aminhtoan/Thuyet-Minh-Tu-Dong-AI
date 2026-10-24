import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonProps = Omit<PressableProps, 'children' | 'style'> & { children: ReactNode; variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; wrapLabel?: boolean };

export function Button({ children, variant = 'primary', size = 'md', loading = false, disabled, wrapLabel = false, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: isDisabled, busy: loading }} disabled={isDisabled} style={({ pressed }) => [styles.base, styles[size], styles[variant], pressed && !isDisabled && styles[`${variant}Pressed`], isDisabled && styles.disabled]} {...props}>
      {loading && <Spinner label="Đang tải" color={variant === 'primary' || variant === 'danger' ? colors.white : colors.primary} style={styles.spinner} />}
      <View style={wrapLabel && styles.wrappedContent}><Text style={[styles.label, styles[`${variant}Label`], wrapLabel && styles.wrappedLabel]}>{children}</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { position: 'relative', minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: 'transparent', borderRadius: radius.md, paddingHorizontal: spacing.md },
  sm: { minHeight: 44 }, md: { minHeight: 48 }, lg: { minHeight: 54, paddingHorizontal: spacing.lg },
  primary: { backgroundColor: colors.primary }, primaryPressed: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border }, secondaryPressed: { backgroundColor: colors.surfaceSecondary, borderColor: colors.primary },
  ghost: { backgroundColor: 'transparent' }, ghostPressed: { backgroundColor: colors.primaryLight },
  danger: { backgroundColor: colors.error }, dangerPressed: { backgroundColor: '#991B1B' },
  disabled: { opacity: 0.5 }, spinner: {},
  label: { fontFamily: typography.family.semibold, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  wrappedContent: { flexShrink: 1, minWidth: 0, paddingVertical: spacing.sm }, wrappedLabel: { textAlign: 'center' },
  primaryLabel: { color: colors.white }, secondaryLabel: { color: colors.textPrimary }, ghostLabel: { color: colors.primary }, dangerLabel: { color: colors.white },
});
