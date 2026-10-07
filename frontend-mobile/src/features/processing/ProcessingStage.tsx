import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/common/Badge';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Spinner } from '@/components/common/Spinner';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { clampProgress } from './processingUtils';
import type { ProcessingStage as Stage } from './types';

export function ProcessingStage({ stage }: { stage: Stage }) {
  const active = stage.status === 'PROCESSING';
  return <View style={[styles.stage, active && styles.active, stage.status === 'FAILED' && styles.failed]}>
    <View style={styles.heading}>
      {active ? <Spinner label={'Đang xử lý ' + stage.title} /> : <Text style={styles.icon}>{stage.status === 'COMPLETED' ? '✓' : stage.status === 'FAILED' ? '!' : stage.status === 'CANCELLED' ? '×' : '○'}</Text>}
      <Text style={styles.title}>{stage.title}</Text>
      <Badge variant={stage.status === 'COMPLETED' ? 'success' : stage.status === 'FAILED' ? 'error' : active ? 'info' : 'default'}>{stage.status}</Badge>
    </View>
    {stage.description && <Text style={styles.note}>{stage.description}</Text>}
    {stage.progress !== undefined && <ProgressBar value={clampProgress(stage.progress)} label={stage.title} />}
  </View>;
}
const styles = StyleSheet.create({
  stage: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  active: { borderColor: colors.primary }, failed: { borderColor: colors.error, backgroundColor: colors.errorLight },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  icon: { color: colors.textSecondary, width: 20, textAlign: 'center' },
  title: { flexGrow: 1, flexShrink: 1, color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: '600' },
  note: { color: colors.textSecondary, fontSize: typography.size.sm },
});
