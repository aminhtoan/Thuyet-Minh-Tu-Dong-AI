import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { formatChartDate, parseChartDate, updateChartDate, type ProjectTimeRange } from './dashboardChartMetrics';

export function DashboardTimeFilter({ mode, anchor, onApply }: { mode: ProjectTimeRange; anchor: Date; onApply: (mode: ProjectTimeRange, anchor: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [draftMode, setDraftMode] = useState(mode);
  const [date, setDate] = useState(formatChartDate(anchor));
  const [month, setMonth] = useState(String(anchor.getMonth() + 1));
  const [year, setYear] = useState(String(anchor.getFullYear()));
  const [error, setError] = useState<string | null>(null);
  function setDraft(next: Date) { setDate(formatChartDate(next)); setMonth(String(next.getMonth() + 1)); setYear(String(next.getFullYear())); setError(null); }
  function changeDate(value: string) {
    setDate(value);
    const next = parseChartDate(value);
    if (next) setDraft(next);
  }
  function changePeriod(field: 'month' | 'year', value: string) {
    const nextMonth = field === 'month' ? value : month;
    const nextYear = field === 'year' ? value : year;
    if (field === 'month') setMonth(value); else setYear(value);
    const parsed = parseChartDate(date);
    // Web keeps one draft anchor across modes. Keep valid native text edits in
    // sync with that anchor, retaining incomplete/invalid input for validation.
    if (parsed && /^\d{1,2}$/.test(nextMonth) && Number(nextMonth) >= 1 && Number(nextMonth) <= 12 && /^\d{4}$/.test(nextYear) && Number(nextYear) >= 1970 && Number(nextYear) <= 9999) {
      setDraft(updateChartDate(parsed, Number(nextYear), Number(nextMonth) - 1));
    }
  }
  function toggle() {
    if (!open) { setDraftMode(mode); setDraft(anchor); }
    setOpen(!open);
  }
  function apply() {
    const parsed = parseChartDate(date);
    const y = Number(year);
    const m = Number(month);
    if (!parsed || (draftMode !== 'day' && (!/^\d{4}$/.test(year) || y < 1970 || y > 9999)) || (draftMode === 'month' && (!/^\d{1,2}$/.test(month) || m < 1 || m > 12))) {
      setError('Vui lòng nhập ngày, tháng và năm hợp lệ.');
      return;
    }
    const next = draftMode === 'day' ? parsed : updateChartDate(parsed, y, draftMode === 'month' ? m - 1 : parsed.getMonth());
    onApply(draftMode, next);
    setOpen(false);
  }
  return <View style={styles.container}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel="Bộ lọc thời gian" onPress={toggle} style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}><Text style={styles.label}>Theo {mode === 'day' ? 'ngày' : mode === 'month' ? 'tháng' : 'năm'} · {open ? 'Đóng' : 'Bộ lọc'}</Text></Pressable>
    {open && <View style={styles.panel}>
      <Text style={styles.label}>Khoảng thống kê</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Khoảng thống kê" style={styles.modes}>{(['day', 'month', 'year'] as const).map((value, index) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: draftMode === value }} onPress={() => setDraftMode(value)} style={({ pressed }) => [styles.mode, draftMode === value && styles.selected, pressed && styles.pressed]}><Text style={styles.label}>{['Ngày', 'Tháng', 'Năm'][index]}</Text></Pressable>)}</View>
      {draftMode === 'day' ? <Input label="Ngày kết thúc" accessibilityLabel="Ngày kết thúc" value={date} onChangeText={changeDate} helperText="YYYY-MM-DD" autoCapitalize="none" /> : <>
        {draftMode === 'month' && <Input label="Tháng" accessibilityLabel="Tháng" keyboardType="number-pad" value={month} onChangeText={value => changePeriod('month', value)} />}
        <Input label="Năm" accessibilityLabel="Năm" keyboardType="number-pad" value={year} onChangeText={value => changePeriod('year', value)} />
      </>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button variant="secondary" wrapLabel onPress={() => { setDraftMode('day'); setDraft(new Date()); }}>Đặt lại</Button>
      <Button wrapLabel onPress={apply}>Áp dụng</Button>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginTop: spacing.sm }, trigger: { minHeight: 48, padding: spacing.sm, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  label: { fontFamily: typography.family.semibold, fontSize: typography.size.sm, lineHeight: 22, color: colors.textPrimary }, pressed: { backgroundColor: colors.primaryLight },
  panel: { gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.background, borderRadius: radius.md }, modes: { flexDirection: 'row', gap: spacing.sm },
  mode: { flex: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, selected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  error: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, color: colors.error },
});
