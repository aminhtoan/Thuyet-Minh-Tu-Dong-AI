import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { workflowStepLabels } from '@/localization/statusLabels.mjs';

export function WorkflowSteps({ current }: { current: 'transcript' | 'translation' | 'voice' | 'generate' | 'result' }) {
  const activeIndex = current === 'result' ? 5 : current === 'transcript' ? 1 : current === 'translation' ? 2 : current === 'voice' ? 3 : 4;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}
    accessibilityRole="list" accessibilityLabel="Quy trình dự án gồm 6 bước">
    {workflowStepLabels.map((step, index) => {
      const state = index < activeIndex ? 'đã hoàn tất' : index === activeIndex ? 'bước hiện tại' : 'chưa mở';
      return <View key={step} accessibilityRole="text" accessibilityLabel={`${step}, ${state}`}
        accessibilityState={{ selected: index === activeIndex, disabled: index > activeIndex }}
        style={[styles.step, index < activeIndex && styles.done, index === activeIndex && styles.active, index > activeIndex && styles.locked]}>
        <Text style={[styles.stepText, index < activeIndex && styles.doneText, index === activeIndex && styles.activeText]}>
          {index < activeIndex ? '✓ ' : index === activeIndex ? '● ' : ''}{step}
        </Text>
      </View>;
    })}
  </ScrollView>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.md },
  step: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceSecondary },
  stepText: { color: colors.textSecondary, fontSize: 12 },
  done: { backgroundColor: colors.successLight },
  doneText: { color: colors.success },
  active: { backgroundColor: colors.primaryLight },
  activeText: { color: colors.primary, fontWeight: '600' },
  locked: { opacity: 0.72 },
});
