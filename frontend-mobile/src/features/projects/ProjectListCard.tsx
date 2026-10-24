import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { colors, spacing, typography } from '@/theme/tokens';
import { DashboardResumeButton } from './DashboardResumeButton';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { dashboardWorkflowPath } from './dashboardResume';
import { projectListActionLabel, projectListLanguagePair } from './projectListModel';
import type { Project } from './types';

export function ProjectListCard({ project }: { project: Project }) {
  const openDetails = () => router.push(`/projects/${project.id}`);
  const createdDate = project.createdAt && Number.isFinite(Date.parse(project.createdAt)) ? new Date(project.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const state = project.metadataState?.media;
  const media = state === 'ERROR' ? 'Không tải được thông tin' : state === 'UNKNOWN' || !state ? 'Chưa xác định' : project.mediaType === 'VIDEO' ? 'Video' : project.mediaType === 'AUDIO' ? 'Âm thanh' : 'Chưa có tệp';
  const label = projectListActionLabel(project);
  return <Card padding="sm"><View style={styles.content}>
    <Pressable accessibilityRole="link" accessibilityLabel={`Mở dự án ${project.name}, tạo ngày ${createdDate}`} onPress={openDetails} style={({ pressed }) => [styles.nameControl, pressed && styles.pressed]}><Text style={styles.name}>{project.name}</Text></Pressable>
    <View style={styles.badge}><ProjectStatusBadge status={project.status} /></View>
    <Text style={styles.meta}>Phương tiện: {media}</Text>
    <Text style={styles.meta}>Ngôn ngữ: {projectListLanguagePair(project)}</Text>
    <Text style={styles.meta}>Ngày tạo: {createdDate}</Text>
    {label === 'Xem chi tiết' || !dashboardWorkflowPath(project) ? <Button variant="secondary" wrapLabel onPress={openDetails}>Xem chi tiết</Button> : <DashboardResumeButton projectId={project.id} label={label} />}
  </View></Card>;
}
const styles = StyleSheet.create({ content: { gap: spacing.sm, minWidth: 0 }, nameControl: { minHeight: 48, justifyContent: 'center' }, pressed: { opacity: 0.75 }, name: { fontFamily: typography.family.semibold, fontSize: typography.size.md, lineHeight: 24, color: colors.primary }, meta: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, color: colors.textSecondary }, badge: { alignSelf: 'flex-start', maxWidth: '100%' } });
