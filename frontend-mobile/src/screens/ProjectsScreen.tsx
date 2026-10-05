import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Input } from '@/components/common/Input';
import { Spinner } from '@/components/common/Spinner';
import { FilterChips } from '@/features/projects/FilterChips';
import { ProjectCard } from '@/features/projects/ProjectCard';
import { filterProjects } from '@/features/projects/projectUtils';
import type { ProjectStatusFilter } from '@/features/projects/types';
import { useProjects } from '@/features/projects/useProjects';
import { colors, spacing, typography } from '@/theme/tokens';

export function ProjectsScreen() {
  const { projects, isLoading, error } = useProjects();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProjectStatusFilter>('ALL');
  const filteredProjects = useMemo(() => filterProjects(projects, query, status), [projects, query, status]);
  const hasActiveFilters = Boolean(query.trim()) || status !== 'ALL';
  const header = <View style={styles.header}><View style={styles.pageHeading}><View style={styles.headingText}><Text style={styles.title}>Dự án</Text><Text style={styles.description}>Xem và quản lý các dự án thuyết minh.</Text></View><Button size="sm" onPress={() => router.push('/projects/new')}>Dự án mới</Button></View><Input accessibilityLabel="Tìm kiếm dự án" placeholder="Tìm kiếm dự án..." returnKeyType="search" autoCorrect={false} value={query} onChangeText={setQuery} /><FilterChips value={status} onChange={setStatus} /></View>;

  if (isLoading) return <View style={styles.center}><Spinner size="large" /><Text style={styles.description}>Đang tải dự án...</Text></View>;
  if (error) return <View style={styles.center}><Card><ErrorState title="Không thể tải dự án" description={error} /></Card></View>;

  return <FlatList style={styles.screen} contentContainerStyle={styles.content} data={filteredProjects} keyExtractor={(project) => project.id} renderItem={({ item }) => <ProjectCard project={item} />} ItemSeparatorComponent={() => <View style={styles.separator} />} ListHeaderComponent={header} ListEmptyComponent={<Card><EmptyState title={projects.length === 0 ? 'Chưa có dự án' : 'Không tìm thấy dự án'} description={projects.length === 0 ? 'Tạo dự án thuyết minh đa ngôn ngữ đầu tiên của bạn.' : 'Hãy điều chỉnh từ khóa hoặc bộ lọc trạng thái.'} action={projects.length === 0 ? <Button size="sm" onPress={() => router.push('/projects/new')}>Dự án mới</Button> : hasActiveFilters ? <Button size="sm" variant="secondary" onPress={() => { setQuery(''); setStatus('ALL'); }}>Xóa bộ lọc</Button> : undefined} /></Card>} keyboardShouldPersistTaps="handled" />;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xl }, header: { gap: spacing.md, marginBottom: spacing.lg }, pageHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }, headingText: { minWidth: 0, flex: 1, gap: spacing.xs }, title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold }, description: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21 }, separator: { height: spacing.md }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.background } });
