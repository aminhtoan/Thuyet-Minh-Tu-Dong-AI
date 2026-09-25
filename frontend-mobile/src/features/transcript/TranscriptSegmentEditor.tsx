import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { formatTimestamp } from './transcriptUtils';
import type { TranscriptSegment } from './types';

type Props = { segment: TranscriptSegment; error?: string; disabled: boolean; onChange: (id: string, text: string) => void };

export function TranscriptSegmentEditor({ segment, error, disabled, onChange }: Props) {
  return <View style={[styles.card, error && styles.invalid]}><View style={styles.meta}><Text style={styles.number}>#{String(segment.sequence).padStart(2, '0')}</Text><Text style={styles.time}>{formatTimestamp(segment.startTime)} → {formatTimestamp(segment.endTime)}</Text></View><TextInput accessibilityLabel={`Segment ${segment.sequence} text, ${formatTimestamp(segment.startTime)} to ${formatTimestamp(segment.endTime)}`} accessibilityHint={error} multiline numberOfLines={4} textAlignVertical="top" autoCapitalize="none" value={segment.text} onChangeText={(text) => onChange(segment.id, text)} editable={!disabled} style={[styles.input, error && styles.inputInvalid]} />{error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}</View>;
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  invalid: { borderColor: colors.error, backgroundColor: colors.errorLight },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  number: { color: colors.primary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  time: { color: colors.primary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  input: { minHeight: 88, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.textPrimary, backgroundColor: colors.surface, fontSize: typography.size.md, lineHeight: 23 },
  inputInvalid: { borderColor: colors.error },
  error: { color: colors.error, fontSize: typography.size.sm },
});
