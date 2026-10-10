import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Input } from '@/components/common/Input';
import { Spinner } from '@/components/common/Spinner';
import { FilterChips } from '@/features/projects/FilterChips';
import { ProjectCard } from '@/features/projects/ProjectCard';
import type { ProjectStatus, ProjectStatusFilter } from '@/features/projects/types';
import { useProjectPage } from '@/features/projects/useProjects';
import { colors, spacing, typography } from '@/theme/tokens';

export function ProjectsScreen() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProjectStatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const { projects, pagination, isLoading, error, reload } = useProjectPage({ page, limit: 10, search: query || undefined, status: status === 'ALL' ? undefined : status as ProjectStatus });
  const changeQuery = (value: string) => { setQuery(value); setPage(1); };
  const changeStatus = (value: ProjectStatusFilter) => { setStatus(value); setPage(1); };
  const hasActiveFilters = Boolean(query.trim()) || status !== 'ALL';
  const header = <View style={styles.header}><View style={styles.pageHeading}><View style={styles.headingText}><Text style={styles.title}>Dự án</Text><Text style={styles.description}>Xem và quản lý các dự án thuyết minh.</Text></View><Button size="sm" onPress={() => router.push('/projects/new')}>Dự án mới</Button></View><Input accessibilityLabel="Tìm kiếm dự án" placeholder="Tìm kiếm dự án..." returnKeyType="search" autoCorrect={false} value={query} onChangeText={changeQuery} /><FilterChips value={status} onChange={changeStatus} /></View>;

  if (isLoading) return <View style={styles.center}><Spinner size="large" /><Text style={styles.description}>Đang tải dự án...</Text></View>;
  if (error) return <View style={styles.center}><Card><ErrorState title="Không thể tải dự án" description={error} onRetry={reload} /></Card></View>;

  return <FlatList style={styles.screen} contentContainerStyle={styles.content} data={projects} keyExtractor={(project) => project.id} renderItem={({ item }) => <ProjectCard project={item} />} ItemSeparatorComponent={() => <View style={styles.separator} />} ListHeaderComponent={header} ListFooterComponent={projects.length ? <View style={styles.pagination}><Text style={[styles.description, styles.paginationInfo]}>Trang {pagination.page}/{Math.max(1, pagination.totalPages)} · {pagination.total} dự án</Text><View style={styles.paginationControls}><View style={styles.paginationButton}><Button size="sm" variant="secondary" disabled={page <= 1} onPress={() => setPage((value) => value - 1)}>Trang trước</Button></View><View style={styles.paginationButton}><Button size="sm" variant="secondary" disabled={page >= pagination.totalPages} onPress={() => setPage((value) => value + 1)}>Trang sau</Button></View></View></View> : null} ListEmptyComponent={<Card><EmptyState title={!hasActiveFilters ? 'Chưa có dự án' : 'Không tìm thấy dự án'} description={!hasActiveFilters ? 'Tạo dự án thuyết minh đa ngôn ngữ đầu tiên của bạn.' : 'Hãy điều chỉnh từ khóa hoặc bộ lọc trạng thái.'} action={!hasActiveFilters ? <Button size="sm" onPress={() => router.push('/projects/new')}>Dự án mới</Button> : <Button size="sm" variant="secondary" onPress={() => { setQuery(''); setStatus('ALL'); setPage(1); }}>Xóa bộ lọc</Button>} /></Card>} keyboardShouldPersistTaps="handled" />;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xl }, header: { gap: spacing.md, marginBottom: spacing.lg }, pageHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }, headingText: { minWidth: 210, flex: 1, gap: spacing.xs }, title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold }, description: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21 }, separator: { height: spacing.md }, pagination: { gap: spacing.sm, paddingTop: spacing.lg }, paginationInfo: { textAlign: 'center' }, paginationControls: { flexDirection: 'row', gap: spacing.sm }, paginationButton: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.background } });
