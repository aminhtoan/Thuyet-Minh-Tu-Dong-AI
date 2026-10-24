import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Spinner } from '@/components/common/Spinner';
import { ProjectListCard } from '@/features/projects/ProjectListCard';
import { ProjectListFilters } from '@/features/projects/ProjectListFilters';
import { useCompleteProjectList as useCompleteHistory } from '@/features/projects/useCompleteProjectList';
import { defaultProjectListFilters, filterAndSortProjects, projectListPage, type ProjectListFilters as Filters } from '@/features/projects/projectListModel';
import { colors, spacing, typography } from '@/theme/tokens';

export function ProjectsScreen() {
  const [applied, setApplied] = useState<Filters>({ ...defaultProjectListFilters });
  const [page, setPage] = useState(1);
  const { projects: allProjects, isLoading, error, reload } = useCompleteHistory();
  const pagination = projectListPage(filterAndSortProjects(allProjects, applied), page);
  const { projects } = pagination;
  const incompleteMetadata = allProjects.some(project => !project.metadataState || ['ERROR', 'UNKNOWN'].includes(project.metadataState.media) || ['ERROR', 'UNKNOWN'].includes(project.metadataState.translation));
  const header = <View style={styles.header}>
    <Text accessibilityRole="header" style={styles.title}>Dự án của tôi</Text>
    <Text style={styles.description}>Quản lý và tiếp tục các dự án thuyết minh.</Text>
    <Button wrapLabel onPress={() => router.push('/projects/new')}>Tạo dự án</Button>
    <Card padding="sm"><ProjectListFilters applied={applied} loading={isLoading} onApply={filters => { setApplied(filters); setPage(1); }} /></Card>
    {!isLoading && !error && incompleteMetadata && <Text accessibilityRole="status" style={styles.description}>Dữ liệu chưa đầy đủ. Một số thông tin phương tiện hoặc bản dịch chưa tải được; danh sách dự án và trạng thái vẫn được giữ nguyên.</Text>}
  </View>;
  const emptyContent = isLoading ? <View style={styles.loading}><Spinner size="large" label="Đang tải dự án" /><Text style={styles.description}>Đang tải dự án...</Text></View>
    : error ? <Card><ErrorState title="Không thể tải dự án" description={error} onRetry={() => void reload()} /></Card>
      : <Card><EmptyState title={allProjects.length ? 'Không tìm thấy dự án phù hợp' : 'Chưa có dự án'} description={allProjects.length ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc.' : "Chọn 'Tạo thuyết minh' trong menu điều hướng để bắt đầu."} /></Card>;
  return <FlatList style={styles.screen} contentContainerStyle={styles.content} data={isLoading || error ? [] : projects} keyExtractor={project => project.id} renderItem={({ item }) => <ProjectListCard project={item} />} ItemSeparatorComponent={() => <View style={styles.separator} />} ListHeaderComponent={header} ListFooterComponent={!isLoading && !error && projects.length ? <View style={styles.pagination}>
    <Text accessibilityLiveRegion="polite" style={[styles.description, styles.paginationInfo]}>Trang {pagination.page} / {pagination.totalPages}</Text>
    <View accessibilityRole="toolbar" accessibilityLabel="Phân trang dự án" style={styles.paginationControls}>
      <View style={styles.paginationButton}><Button wrapLabel variant="secondary" disabled={pagination.page <= 1} onPress={() => setPage(pagination.page - 1)}>Trang trước</Button></View>
      <View style={styles.paginationButton}><Button wrapLabel variant="secondary" disabled={pagination.page >= pagination.totalPages} onPress={() => setPage(pagination.page + 1)}>Trang sau</Button></View>
    </View>
  </View> : undefined} ListEmptyComponent={emptyContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" />;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.sm, marginBottom: spacing.md }, title: { fontFamily: typography.family.bold, color: colors.textPrimary, fontSize: typography.size.xl, lineHeight: 32 },
  description: { fontFamily: typography.family.regular, color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 22 },
  separator: { height: spacing.md }, loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  pagination: { gap: spacing.sm, paddingTop: spacing.md }, paginationInfo: { textAlign: 'center' }, paginationControls: { flexDirection: 'row', gap: spacing.sm }, paginationButton: { minWidth: 0, flex: 1 },
});
