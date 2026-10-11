import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Spinner } from '@/components/common/Spinner';
import { MobileScreen } from '@/components/layout/MobileScreen';
import { ProjectCard } from '@/features/projects/ProjectCard';
import { StatCard } from '@/features/projects/StatCard';
import { calculateProjectStatistics, getRecentProjects } from '@/features/projects/projectUtils';
import { useProjects } from '@/features/projects/useProjects';
import { colors, spacing, typography } from '@/theme/tokens';

export function DashboardScreen() {
  const { projects, isLoading, error, reload } = useProjects();
  const statistics = calculateProjectStatistics(projects);
  const recentProjects = getRecentProjects(projects);
  return (
    <MobileScreen title="Bảng điều khiển" description="Chào mừng trở lại. Tiếp tục hành trình thuyết minh đa ngôn ngữ của bạn." action={<Button size="sm" onPress={() => router.push('/projects/new')}>Tạo thuyết minh</Button>}>
      <View accessibilityRole="summary" style={styles.stats}><StatCard label="Tổng số dự án" value={statistics.total} /><StatCard label="Hoàn thành" value={statistics.completed} tone="success" /><StatCard label="Đang xử lý" value={statistics.processing} tone="info" /><StatCard label="Thất bại" value={statistics.failed} tone="error" /></View>
      <View style={styles.quickSection}><Text style={styles.sectionTitle}>Thao tác nhanh</Text><View style={styles.quickActions}><Pressable accessibilityRole="button" accessibilityLabel="Tạo thuyết minh" onPress={() => router.push('/projects/new')} style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}><View style={styles.quickIcon}><MaterialCommunityIcons name="plus" size={22} color={colors.primary} /></View><View style={styles.quickText}><Text style={styles.quickTitle}>Tạo thuyết minh</Text><Text style={styles.secondary}>Bắt đầu với video hoặc âm thanh</Text></View></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Mở dự án của tôi" onPress={() => router.push('/projects')} style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}><View style={styles.quickIcon}><MaterialCommunityIcons name="folder-outline" size={22} color={colors.primary} /></View><View style={styles.quickText}><Text style={styles.quickTitle}>Dự án của tôi</Text><Text style={styles.secondary}>Tìm kiếm và tiếp tục dự án</Text></View></Pressable></View></View>
      {isLoading ? <View style={styles.loading}><Spinner size="large" /><Text style={styles.secondary}>Đang tải dự án gần đây...</Text></View> : error ? <Card><ErrorState title="Không thể tải bảng điều khiển" description={error} onRetry={() => void reload()} /></Card> : projects.length === 0 ? <Card><EmptyState title="Chưa có dự án" description="Tạo dự án thuyết minh đa ngôn ngữ đầu tiên của bạn." action={<Button size="sm" onPress={() => router.push('/projects/new')}>Tạo thuyết minh</Button>} /></Card> : <>
        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Dự án gần đây</Text><Text style={styles.secondary}>Các dự án mới cập nhật</Text></View><Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/projects')}><Text style={styles.link}>Xem tất cả</Text></Pressable></View>
        {recentProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
      </>}
    </MobileScreen>
  );
}

const styles = StyleSheet.create({ stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, quickSection: { gap: spacing.sm }, quickActions: { gap: spacing.sm }, quickAction: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface }, quickActionPressed: { borderColor: colors.primary, backgroundColor: colors.primaryLight }, quickIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primaryLight }, quickText: { minWidth: 0, flex: 1, gap: spacing.xs }, quickTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold }, sectionHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, gap: spacing.md }, sectionTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, secondary: { flexShrink: 1, color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 20 }, link: { minHeight: 44, textAlignVertical: 'center', color: colors.primary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold }, loading: { alignItems: 'center', gap: spacing.md, padding: spacing.xl } });
