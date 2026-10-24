import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { colors, radius, typography } from '@/theme/tokens';

type StatCardProps = {
  label: string;
  value: number;
  tone?: 'default' | 'success' | 'info' | 'error';
};

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <Card padding="sm" accessibilityLabel={`${label}: ${value}`} style={styles.card}>
      <View style={[styles.indicator, styles[tone]]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    minHeight: 112,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingLeft: 18,
    borderRadius: radius.md,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  default: {
    backgroundColor: colors.primary,
  },
  success: {
    backgroundColor: colors.success,
  },
  info: {
    backgroundColor: colors.info,
  },
  error: {
    backgroundColor: colors.error,
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.family.semibold,
    fontSize: typography.size.sm,
    lineHeight: 20,
    minHeight: 40,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.15,
  },
  value: {
    fontFamily: typography.family.bold,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: typography.weight.bold,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
});
