import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

type CardProps = ViewProps & { children: ReactNode; padding?: 'sm' | 'md' | 'lg' };

export function Card({ children, padding = 'md', style, ...props }: CardProps) {
  return <View style={[styles.card, styles[padding], style]} {...props}>{children}</View>;
}

const styles = StyleSheet.create({ card: { minWidth: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, ...shadows.sm }, sm: { padding: spacing.md }, md: { padding: spacing.lg }, lg: { padding: spacing.xl } });
