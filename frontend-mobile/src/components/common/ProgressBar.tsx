import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type ProgressBarProps = { value: number; label?: string; showValue?: boolean };

export function ProgressBar({ value, label, showValue = true }: ProgressBarProps) {
  const normalizedValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return <View accessibilityRole="progressbar" accessibilityLabel={label ?? 'Tiến độ'} accessibilityValue={{ min: 0, max: 100, now: normalizedValue }} style={styles.container}>{(label || showValue) && <View style={styles.meta}><Text style={styles.metaText}>{label}</Text>{showValue && <Text style={styles.metaText}>{normalizedValue}%</Text>}</View>}<View style={styles.track}><View style={[styles.bar, { width: `${normalizedValue}%` }]} /></View></View>;
}

const styles = StyleSheet.create({ container: { gap: spacing.sm }, meta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, metaText: { color: colors.textSecondary, fontSize: typography.size.sm }, track: { height: 8, overflow: 'hidden', backgroundColor: colors.border, borderRadius: radius.full }, bar: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full } });
