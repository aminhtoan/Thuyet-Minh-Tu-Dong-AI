import { router } from 'expo-router';
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
  const { projects, isLoading, error } = useProjects();
  const statistics = calculateProjectStatistics(projects);
  const recentProjects = getRecentProjects(projects);
  return (
    <MobileScreen title="Dashboard" description="Welcome back. Manage your multilingual narration projects." action={<Button size="sm" onPress={() => router.push('/projects/new')}>New Project</Button>}>
      {isLoading ? <View style={styles.loading}><Spinner size="large" /><Text style={styles.secondary}>Loading dashboard...</Text></View> : error ? <Card><ErrorState title="Unable to load projects" description={error} /></Card> : projects.length === 0 ? <Card><EmptyState title="No projects yet" description="Create your first multilingual narration project." action={<Button size="sm" onPress={() => router.push('/projects/new')}>Create Project</Button>} /></Card> : <>
        <View style={styles.stats}><StatCard label="Total" value={statistics.total} /><StatCard label="Completed" value={statistics.completed} tone="success" /><StatCard label="Processing" value={statistics.processing} tone="info" /><StatCard label="Failed" value={statistics.failed} tone="error" /></View>
        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Recent Projects</Text><Text style={styles.secondary}>Recently updated work</Text></View><Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/projects')}><Text style={styles.link}>View all</Text></Pressable></View>
        {recentProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
      </>}
    </MobileScreen>
  );
}

const styles = StyleSheet.create({ stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, sectionHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }, sectionTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, secondary: { color: colors.textSecondary, fontSize: typography.size.sm }, link: { color: colors.primary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold }, loading: { alignItems: 'center', gap: spacing.md, padding: spacing.xl } });
