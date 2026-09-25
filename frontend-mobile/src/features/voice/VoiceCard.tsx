import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { languageNames } from '../projects/projectUtils';
import type { Voice } from './types';

type Props = { voice: Voice; selected: boolean; previewing: boolean; disabled: boolean; onSelect: () => void; onPreview: () => void };
export function VoiceCard({ voice, selected, previewing, disabled, onSelect, onPreview }: Props) {
  return <View style={[styles.card, selected && styles.selected]}>
    <View style={styles.heading}><Text style={styles.name}>{voice.name}</Text>{selected && <Text style={styles.selectedLabel}>✓ Selected</Text>}</View>
    <Text style={styles.note}>{voice.gender} · {languageNames[voice.languageCode]}</Text>
    <Text style={styles.description}>{voice.description}</Text>
    <Text accessibilityLiveRegion="polite" style={styles.note}>{previewing ? 'Preview simulation running... No audio is played.' : 'Demo voice · simulated preview'}</Text>
    <View style={styles.actions}>
      <Button variant="secondary" disabled={disabled} accessibilityLabel={(previewing ? 'Stop preview of ' : 'Preview ') + voice.name + ' voice'} onPress={onPreview}>{previewing ? 'Stop Preview' : 'Preview'}</Button>
      <Button variant={selected ? 'primary' : 'secondary'} disabled={disabled} accessibilityLabel={'Select ' + voice.name + ' voice'} accessibilityState={{ selected, disabled }} onPress={onSelect}>{selected ? 'Selected' : 'Select'}</Button>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderWidth: 2, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  selected: { borderColor: colors.primary },
  heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  name: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: '600' },
  selectedLabel: { color: colors.primary, fontSize: typography.size.sm, fontWeight: '600' },
  note: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21 },
  description: { color: colors.textPrimary, fontSize: typography.size.md, lineHeight: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
});
