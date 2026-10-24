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
import { DashboardHero } from '@/features/projects/DashboardHero';
import { DashboardCharts } from '@/features/projects/DashboardCharts';
import { formatRelativeDate, getProjectStatusLabel, getRecentProjects } from '@/features/projects/projectUtils';
import { useDashboardProjects as useProjects } from '@/features/projects/useDashboardProjects';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const quickActions = [
  { title: 'Tạo thuyết minh', detail: 'Bắt đầu với video hoặc âm thanh', icon: 'video-outline', route: '/projects/new' },
  { title: 'Bản ghi', detail: 'Chọn dự án để xem bản ghi', icon: 'file-document-outline', route: '/projects' },
  { title: 'Bản dịch', detail: 'Chọn dự án và ngôn ngữ đích', icon: 'translate', route: '/projects' },
  { title: 'Giọng đọc', detail: 'Chọn dự án để cấu hình giọng đọc', icon: 'microphone-outline', route: '/projects' },
] as const;

export function DashboardScreen() {
  const { projects, complete, isLoading, error, reload } = useProjects();
  const recentProjects = getRecentProjects(projects, 5);
  return (
    <MobileScreen dashboard title="Khởi tạo hành trình thuyết minh đa ngôn ngữ" headerContent={<DashboardHero />}>
      <View accessibilityLabel="Lối tắt sáng tạo" style={styles.quickSection}><View style={styles.quickActions}>{quickActions.map(action => <Pressable key={action.title} accessibilityRole="button" accessibilityLabel={action.title} onPress={() => router.push(action.route)} style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}><View style={styles.quickIcon}><MaterialCommunityIcons accessible={false} name={action.icon} size={22} color={colors.primary} /></View><View style={styles.quickText}><Text style={styles.quickTitle}>{action.title}</Text><Text style={styles.secondary}>{action.detail}</Text></View></Pressable>)}</View></View>
      {isLoading ? <View style={styles.loading}><Spinner size="large" /><Text style={styles.secondary}>Đang tải dữ liệu dự án...</Text></View> : error ? <Card><ErrorState title="Không thể tải bảng điều khiển" description={error} onRetry={() => void reload()} /></Card> : <>
        <DashboardCharts projects={projects} complete={complete} />
        <View style={styles.sectionHeader}><View style={styles.sectionCopy}><Text accessibilityRole="header" style={styles.sectionTitle}>Dự án gần đây</Text><Text style={styles.secondary}>Các dự án mới cập nhật</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Xem tất cả dự án" onPress={() => router.push('/projects')} style={({ pressed }) => [styles.allProjects, pressed && styles.quickActionPressed]}><Text style={styles.link}>Xem tất cả</Text></Pressable></View>
        {recentProjects.length ? recentProjects.map((project) => <ProjectCard key={project.id} project={project} dashboard />) : <Card><EmptyState title="Chưa có dự án" description="Tạo dự án đầu tiên để bắt đầu quy trình thuyết minh." action={<Button onPress={() => router.push('/projects/new')}>Tạo thuyết minh</Button>} /></Card>}
        <Card padding="sm"><Text accessibilityRole="header" style={styles.sectionTitle}>Hoạt động gần đây</Text><Text style={styles.secondary}>Cập nhật trạng thái dự án</Text>
          {recentProjects.length ? recentProjects.slice(0, 4).map(project => <View key={project.id} style={styles.activityRow}>
            <MaterialCommunityIcons accessible={false} name={project.status === 'COMPLETED' ? 'check' : project.status === 'FAILED' ? 'alert-outline' : 'history'} size={20} color={project.status === 'COMPLETED' ? colors.success : project.status === 'FAILED' ? colors.error : colors.primary} />
            <View style={styles.quickText}><Text style={styles.secondary}>{project.name} · {getProjectStatusLabel(project.status)}</Text><Text style={styles.secondary}>{formatRelativeDate(project.updatedAt)}</Text></View>
          </View>) : <Text style={styles.secondary}>Chưa có hoạt động gần đây</Text>}
          <Button variant="ghost" wrapLabel onPress={() => router.push('/history')}>Xem lịch sử</Button>
        </Card>
      </>}
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  quickSection: { gap: spacing.sm }, quickActions: { gap: spacing.sm },
  quickAction: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm * 1.5, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  quickActionPressed: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  quickIcon: { width: 40, height: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primaryLight },
  quickText: { minWidth: 0, flex: 1, gap: spacing.xs }, quickTitle: { fontFamily: typography.family.semibold, color: colors.textPrimary, fontSize: typography.size.md, lineHeight: 24 },
  sectionHeader: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, gap: spacing.sm }, sectionCopy: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  sectionTitle: { fontFamily: typography.family.semibold, color: colors.textPrimary, fontSize: typography.size.lg, lineHeight: 28 },
  secondary: { fontFamily: typography.family.regular, flexShrink: 1, color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 22 },
  allProjects: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.md },
  link: { fontFamily: typography.family.semibold, color: colors.primary, fontSize: typography.size.sm, lineHeight: 22 }, loading: { alignItems: 'center', gap: spacing.md, padding: spacing.lg },
});
