import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { projectStatusLabels } from '@/localization/statusLabels.mjs';
import type { ProjectStatusFilter } from './types';

const options: { value: ProjectStatusFilter; label: string }[] = [{ value: 'ALL', label: 'Tất cả' }, ...Object.entries(projectStatusLabels).map(([value, label]) => ({ value: value as ProjectStatusFilter, label }))];

export function FilterChips({ value, onChange }: { value: ProjectStatusFilter; onChange: (value: ProjectStatusFilter) => void }) {
  return <ScrollView horizontal style={styles.scroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" accessibilityRole="tablist">{options.map((option) => { const active = option.value === value; return <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onChange(option.value)} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text></Pressable>; })}</ScrollView>;
}

const styles = StyleSheet.create({ scroll: { flexGrow: 0, marginHorizontal: -spacing.md }, content: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }, chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full }, chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium }, labelActive: { color: colors.white, fontWeight: typography.weight.semibold } });
