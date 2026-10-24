import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewProps } from 'react-native';
import { colors, radius, typography } from '@/theme/tokens';
import { getDisplayStatus } from '@/utils/displayLabels';

type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'error';
type BadgeProps = ViewProps & { children: ReactNode; variant?: BadgeVariant; labelStyle?: StyleProp<TextStyle> };

export function Badge({ children, variant = 'default', style, labelStyle, ...props }: BadgeProps) {
  const label = typeof children === 'string' ? getDisplayStatus(children) : children;
  return <View style={[styles.badge, styles[variant], style]} {...props}><Text style={[styles.label, styles[`${variant}Label`], labelStyle]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', minHeight: 26, justifyContent: 'center', paddingHorizontal: 10, borderRadius: radius.full }, label: { fontSize: 12, fontWeight: typography.weight.semibold },
  default: { backgroundColor: colors.surfaceSecondary }, defaultLabel: { color: colors.textSecondary }, info: { backgroundColor: colors.infoLight }, infoLabel: { color: colors.info }, success: { backgroundColor: colors.successLight }, successLabel: { color: colors.success }, warning: { backgroundColor: colors.warningLight }, warningLabel: { color: colors.warning }, error: { backgroundColor: colors.errorLight }, errorLabel: { color: colors.error },
});
