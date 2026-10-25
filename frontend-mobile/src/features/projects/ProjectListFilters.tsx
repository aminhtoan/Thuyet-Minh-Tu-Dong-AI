import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { projectStatusLabels } from '@/localization/statusLabels.mjs';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { defaultProjectListFilters, projectDateError, projectPeriodOptions, projectSortOptions, type ProjectListFilters as Filters } from './projectListModel';

function Choice({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}><Text style={styles.text}>{options.find(option => option[0] === value)?.[1]}</Text><Text accessible={false} style={styles.label}>{open ? '−' : '+'}</Text></Pressable>
    {open && <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.options}>{options.map(([key, name]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: value === key }} onPress={() => { onChange(key); setOpen(false); }} style={({ pressed }) => [styles.option, value === key && styles.selected, pressed && styles.pressed]}><Text style={styles.text}>{name}</Text></Pressable>)}</View>}
  </View>;
}
export function ProjectListFilters({ applied, loading, onApply }: { applied: Filters; loading: boolean; onApply: (filters: Filters) => void }) {
  const [draft, setDraft] = useState(applied), [open, setOpen] = useState(false), [error, setError] = useState('');
  const count = [applied.period !== 'ALL', applied.status !== 'ALL', applied.sort !== 'NEWEST'].filter(Boolean).length;
  const canReset = Boolean(draft.query || draft.status !== 'ALL' || draft.period !== 'ALL' || draft.from || draft.to || draft.sort !== 'NEWEST');
  function apply() {
    const message = projectDateError(draft); setError(message);
    if (message) { setOpen(true); return; }
    onApply({ ...draft, query: draft.query.trim(), from: draft.period === 'CUSTOM' ? draft.from : '', to: draft.period === 'CUSTOM' ? draft.to : '' }); setOpen(false);
  }
  return <View style={styles.panel}>
    <Input label="Tìm kiếm dự án" accessibilityLabel="Tìm kiếm dự án" placeholder="Nhập tên dự án..." value={draft.query} onChangeText={query => setDraft({ ...draft, query })} returnKeyType="search" autoCorrect={false} onSubmitEditing={() => { if (!loading) apply(); }} />
    <View style={styles.toolbar}>
      <View style={styles.cell}><Button variant="secondary" wrapLabel accessibilityState={{ expanded: open }} accessibilityLabel={count ? `Bộ lọc, ${count} bộ lọc nâng cao đang áp dụng` : 'Bộ lọc nâng cao'} onPress={() => setOpen(!open)}>Bộ lọc{count ? ` (${count})` : ''}</Button></View>
      <View style={styles.cell}><Button wrapLabel disabled={loading} onPress={apply}>Tìm kiếm</Button></View>
    </View>
    {open && <View style={styles.advanced}>
      <Choice label="Thời gian" value={draft.period} options={projectPeriodOptions} onChange={period => setDraft({ ...draft, period })} />
      <Choice label="Trạng thái" value={draft.status} options={[['ALL', 'Tất cả trạng thái'], ...Object.entries(projectStatusLabels)]} onChange={status => setDraft({ ...draft, status: status as Filters['status'] })} />
      <Choice label="Sắp xếp" value={draft.sort} options={projectSortOptions} onChange={sort => setDraft({ ...draft, sort })} />
      {draft.period === 'CUSTOM' && <><Input label="Từ ngày" accessibilityLabel="Từ ngày" helperText="YYYY-MM-DD" value={draft.from} onChangeText={from => setDraft({ ...draft, from })} /><Input label="Đến ngày" accessibilityLabel="Đến ngày" helperText="YYYY-MM-DD" value={draft.to} onChangeText={to => setDraft({ ...draft, to })} /></>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {canReset && <><Text style={styles.helper}>Đặt lại chỉ thay đổi lựa chọn đang soạn. Nhấn Tìm kiếm để áp dụng.</Text><Button variant="ghost" wrapLabel onPress={() => { setDraft({ ...defaultProjectListFilters }); setError(''); }}>Đặt lại</Button></>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  panel: { gap: spacing.sm }, toolbar: { flexDirection: 'row', gap: spacing.sm }, cell: { flex: 1, minWidth: 0 }, advanced: { gap: spacing.md, paddingTop: spacing.sm }, field: { gap: spacing.sm },
  label: { fontFamily: typography.family.semibold, fontSize: typography.size.sm, color: colors.textPrimary }, text: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, color: colors.textPrimary, flexShrink: 1 },
  helper: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, color: colors.textSecondary }, error: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, color: colors.error },
  choice: { minHeight: 48, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  options: { gap: spacing.xs }, option: { minHeight: 48, padding: spacing.sm, justifyContent: 'center', borderRadius: radius.sm }, selected: { backgroundColor: colors.primaryLight }, pressed: { backgroundColor: colors.surfaceSecondary },
});
