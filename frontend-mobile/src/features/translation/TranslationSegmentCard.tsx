import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { TranscriptSegment } from '../transcript/types';
import { formatTimestamp } from '../transcript/transcriptUtils';
import type { TranslationSegment } from './types';

type Props = {
  source: TranscriptSegment;
  translation?: TranslationSegment;
  error?: string;
  disabled: boolean;
  onChange: (id: string, text: string) => void;
};
export function TranslationSegmentCard({ source, translation, error, disabled, onChange }: Props) {
  return <View style={styles.card}>
    <View style={styles.meta}><Text style={styles.metaText}>#{String(source.sequence).padStart(2, '0')}</Text>
      <Text style={styles.metaText}>{formatTimestamp(source.startTime)} → {formatTimestamp(source.endTime)}</Text></View>
    <Text style={styles.label}>Nội dung gốc</Text><Text selectable style={styles.source}>{source.text}</Text>
    <Text style={styles.label}>Nội dung bản dịch</Text>
    {translation ? <TextInput accessibilityLabel={'Bản dịch cho đoạn ' + source.sequence}
      accessibilityHint={error} multiline textAlignVertical="top" autoCapitalize="none"
      value={translation.translatedText} editable={!disabled}
      onChangeText={(text) => onChange(translation.id, text)}
      style={[styles.input, error && styles.invalid]} /> : <Text style={styles.placeholder}>Bản dịch sẽ hiển thị tại đây.</Text>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  meta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  metaText: { color: colors.primary, fontSize: typography.size.sm, fontWeight: '600' },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: '600' },
  source: { color: colors.textPrimary, fontSize: typography.size.md, lineHeight: 25, backgroundColor: colors.surfaceSecondary, padding: spacing.sm, borderRadius: radius.sm },
  input: { minHeight: 104, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.textPrimary, fontSize: typography.size.md, lineHeight: 25 },
  invalid: { borderColor: colors.error },
  error: { color: colors.error, fontSize: typography.size.sm },
  placeholder: { color: colors.textMuted, paddingVertical: spacing.sm },
});
