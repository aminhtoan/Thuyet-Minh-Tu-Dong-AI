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
    <Card padding="sm" style={styles.card}>
      <View style={[styles.indicator, styles[tone]]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    width: '47%',
    minHeight: 84,
    flexGrow: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingLeft: 18,
    borderRadius: radius.md,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.15,
  },
  value: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: typography.weight.bold,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
});
