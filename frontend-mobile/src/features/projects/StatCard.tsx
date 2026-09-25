import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { colors, spacing, typography } from '@/theme/tokens';

type StatCardProps = { label: string; value: number; tone?: 'default' | 'success' | 'info' | 'error' };

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return <Card padding="sm" style={styles.card}><View style={[styles.indicator, styles[tone]]} /><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></Card>;
}

const styles = StyleSheet.create({ card: { position: 'relative', width: '47%', minHeight: 104, flexGrow: 1, overflow: 'hidden', justifyContent: 'center', gap: spacing.xs }, indicator: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, backgroundColor: colors.border }, default: { backgroundColor: colors.border }, success: { backgroundColor: colors.success }, info: { backgroundColor: colors.info }, error: { backgroundColor: colors.error }, label: { color: colors.textSecondary, fontSize: typography.size.sm }, value: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold } });
