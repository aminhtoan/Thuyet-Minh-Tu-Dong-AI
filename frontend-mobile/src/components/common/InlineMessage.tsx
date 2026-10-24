import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewProps, type StyleProp, type TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type InlineMessageProps = ViewProps & { variant?: 'info' | 'success' | 'error'; children: ReactNode; textStyle?: StyleProp<TextStyle> };

export function InlineMessage({ variant = 'info', children, style, textStyle, ...props }: InlineMessageProps) {
  return <View accessibilityRole={variant === 'error' ? 'alert' : 'text'} style={[styles.base, styles[variant], style]} {...props}><Text style={[styles.text, styles[`${variant}Text`], textStyle]}>{children}</Text></View>;
}

const styles = StyleSheet.create({ base: { paddingHorizontal: spacing.md, paddingVertical: 12, borderWidth: 1, borderRadius: radius.md }, text: { fontSize: typography.size.sm, lineHeight: 20 }, info: { backgroundColor: colors.infoLight, borderColor: '#BAE6FD' }, infoText: { color: colors.info }, success: { backgroundColor: colors.successLight, borderColor: '#BBF7D0' }, successText: { color: colors.success }, error: { backgroundColor: colors.errorLight, borderColor: '#FECACA' }, errorText: { color: colors.error } });
