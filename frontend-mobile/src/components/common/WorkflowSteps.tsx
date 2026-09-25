import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

const steps = ['Upload', 'Transcript', 'Translation', 'Voice', 'Generate'];
export function WorkflowSteps({ current }: { current: 'transcript' | 'translation' | 'voice' | 'generate' }) {
  const activeIndex = current === 'transcript' ? 1 : current === 'translation' ? 2 : current === 'voice' ? 3 : 4;
  return <View style={styles.row} accessibilityLabel="Project workflow">
    {steps.map((step, index) => <Text key={step} style={[styles.step, index < activeIndex && styles.done, index === activeIndex && styles.active]}
      accessibilityLabel={step + (index < activeIndex ? ', complete' : index === activeIndex ? ', current step' : ', upcoming')}>
      {index < activeIndex ? '✓ ' : index === activeIndex ? '● ' : ''}{step}
    </Text>)}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  step: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, fontSize: 12, color: colors.textSecondary, backgroundColor: colors.surfaceSecondary },
  done: { color: colors.success, backgroundColor: colors.successLight },
  active: { color: colors.primary, backgroundColor: colors.primaryLight, fontWeight: '600' },
});
