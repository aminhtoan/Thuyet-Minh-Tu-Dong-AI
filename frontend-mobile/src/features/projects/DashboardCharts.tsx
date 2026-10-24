import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Card } from '@/components/common/Card';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { calculateProjectStatistics } from './projectUtils';
import { buildProjectTimeSeries, buildDonutSegments, buildLinearProjectScale, buildProjectStatusDistribution, DONUT_RADIUS, type ProjectTimeRange } from './dashboardChartMetrics';
import { DashboardTimeFilter } from './DashboardTimeFilter';
import type { Project } from './types';

const statusColors = { completed: colors.success, processing: colors.info, failed: colors.error, other: colors.textMuted };
const scope = 'Thống kê trên toàn bộ dự án của tài khoản.';

export function DashboardCharts({ projects, complete = false, today = new Date() }: { projects: readonly Project[]; complete?: boolean; today?: Date }) {
  const [mode, setMode] = useState<ProjectTimeRange>('day');
  const [anchor, setAnchor] = useState(() => today);
  const series = buildProjectTimeSeries(projects, mode, anchor);
  const scale = buildLinearProjectScale(Math.max(0, ...series.map(day => day.value)));
  const hasTimeData = series.some(day => day.value > 0);
  const missingDates = projects.filter(project => !project.createdAt || Number.isNaN(Date.parse(project.createdAt))).length;
  const statistics = calculateProjectStatistics(projects);
  const distribution = buildProjectStatusDistribution(statistics);
  const segments = buildDonutSegments(distribution);
  const range = `${series[0].fullLabel} – ${series[series.length - 1].fullLabel}`;
  if (!complete) return <View style={styles.stack}>{['Thống kê dự án theo thời gian', 'Trạng thái dự án'].map(title => <Card key={title} padding="sm"><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text accessibilityLiveRegion="polite" style={styles.empty}>Chưa tải đủ dữ liệu để thống kê toàn bộ tài khoản. Vui lòng xem danh sách dự án.</Text></Card>)}</View>;
  return <View style={styles.stack}>
    <Card padding="sm">
      <Text accessibilityRole="header" style={styles.title}>Thống kê dự án theo thời gian</Text>
      <DashboardTimeFilter mode={mode} anchor={anchor} onApply={(nextMode, nextAnchor) => { setMode(nextMode); setAnchor(nextAnchor); }} />
      <Text style={styles.description}>{mode === 'day' ? '7 ngày' : mode === 'month' ? 'Theo tháng' : 'Theo năm'}: {range}</Text>
      <Text style={styles.scope}>{scope}</Text>
      <View style={styles.legendName}><View style={[styles.dot, { backgroundColor: colors.primary }]} /><Text style={styles.body}>Số dự án được tạo</Text></View>
      {hasTimeData ? <View style={styles.barChart}>
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.axis}>{scale.ticks.map(tick => <Text key={tick} style={styles.axisLabel}>{tick}</Text>)}</View>
        <ScrollView horizontal scrollEnabled={mode !== 'day'} style={styles.plotScroll} contentContainerStyle={mode === 'day' ? styles.plotContent : undefined} accessibilityLabel="Biểu đồ số dự án theo thời gian">
        <View style={[styles.columns, mode !== 'day' && { width: series.length * 44, flex: 0 }]}>{series.map(day => <View accessible accessibilityLabel={`${day.fullLabel}: ${day.value} dự án`} key={day.key} style={styles.column}>
          <View style={styles.track}><Text style={styles.barValue}>{day.value}</Text><View style={[styles.bar, { height: (day.value / scale.maximum) * 140 }]} /></View>
          <Text style={styles.dayLabel}>{day.label}</Text>
        </View>)}</View></ScrollView>
      </View> : <Text accessibilityLiveRegion="polite" style={styles.empty}>Chưa có dự án trong khoảng thời gian này.</Text>}
      {missingDates > 0 && <Text style={styles.scope}>{missingDates} dự án chưa có ngày tạo hợp lệ nên không được tính vào biểu đồ thời gian.</Text>}
      <Text style={styles.scope}>Nhóm theo múi giờ thiết bị. Số liệu lấy từ ngày tạo, không phải ngày cập nhật.</Text>
    </Card>
    <Card padding="sm">
      <Text accessibilityRole="header" style={styles.title}>Trạng thái dự án</Text>
      <Text style={styles.scope}>{scope}</Text>
      <View style={styles.donut} accessible accessibilityRole="image" accessibilityLabel={`Tổng ${statistics.total} dự án. ${distribution.map(item => `${item.label}: ${item.value}, ${item.percentage}%`).join('. ')}`}>
        <Svg width="100%" height="100%" viewBox="0 0 200 200" accessible={false}>
          <Circle cx={100} cy={100} r={DONUT_RADIUS} stroke={colors.border} strokeWidth={22} fill="none" />
          <G rotation={-90} origin="100, 100">{segments.map(segment => <Circle key={segment.key} cx={100} cy={100} r={DONUT_RADIUS} fill="none" stroke={statusColors[segment.key]} strokeWidth={22} strokeDasharray={segment.dashArray} strokeDashoffset={segment.dashOffset} />)}</G>
        </Svg>
        <View pointerEvents="none" style={styles.donutCenter}><Text style={styles.total}>{statistics.total}</Text><Text style={styles.totalLabel}>Tổng dự án</Text></View>
      </View>
      {statistics.total === 0 ? <Text accessibilityLiveRegion="polite" style={styles.empty}>Chưa có dữ liệu trạng thái dự án.</Text> : <View style={styles.legend}>{distribution.map(item => <View key={item.key} accessible accessibilityLabel={`${item.label}: ${item.value} dự án, ${item.percentage}%`} style={styles.legendRow}>
        <View style={styles.legendName}><View style={[styles.dot, { backgroundColor: statusColors[item.key] }]} /><Text style={styles.body}>{item.label}</Text></View>
        <Text style={styles.legendValue}>{item.value} · {item.percentage}%</Text>
      </View>)}</View>}
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  stack: { width: '100%', minWidth: 0, gap: spacing.md },
  title: { fontFamily: typography.family.semibold, fontSize: typography.size.lg, lineHeight: 28, color: colors.textPrimary },
  description: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, color: colors.textSecondary, marginTop: spacing.xs },
  scope: { fontFamily: typography.family.regular, fontSize: typography.size.xs, lineHeight: 20, color: colors.textSecondary, marginTop: spacing.sm },
  body: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, color: colors.textPrimary, flexShrink: 1 },
  legend: { gap: spacing.sm }, legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  legendName: { flexDirection: 'row', minWidth: 0, flexShrink: 1, alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  legendValue: { fontFamily: typography.family.semibold, fontSize: typography.size.sm, lineHeight: 22, color: colors.textPrimary },
  dot: { width: 10, height: 10, borderRadius: radius.full, flexShrink: 0 },
  barChart: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md, minWidth: 0 },
  axis: { width: 28, height: 140, justifyContent: 'space-between', marginTop: 20 },
  axisLabel: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, textAlign: 'right' },
  columns: { flex: 1, minWidth: 0, flexDirection: 'row', gap: spacing.xs },
  plotScroll: { flex: 1, minWidth: 0 }, plotContent: { flexGrow: 1 },
  column: { flex: 1, minWidth: 0, alignItems: 'stretch' },
  track: { height: 160, justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  bar: { width: '68%', backgroundColor: colors.primary, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
  barValue: { fontFamily: typography.family.semibold, fontSize: typography.size.xs, lineHeight: 20, color: colors.textPrimary },
  dayLabel: { fontFamily: typography.family.regular, fontSize: typography.size.xs, lineHeight: 18, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  donut: { width: 200, maxWidth: '100%', aspectRatio: 1, alignSelf: 'center', marginVertical: spacing.md },
  donutCenter: { position: 'absolute', top: 0, bottom: 0, left: 28, right: 28, justifyContent: 'center', alignItems: 'center' },
  total: { fontFamily: typography.family.bold, fontSize: 28, lineHeight: 36, color: colors.textPrimary },
  totalLabel: { fontFamily: typography.family.regular, fontSize: typography.size.xs, lineHeight: 20, textAlign: 'center', color: colors.textSecondary },
  empty: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, textAlign: 'center', color: colors.textSecondary, paddingVertical: spacing.lg },
});
