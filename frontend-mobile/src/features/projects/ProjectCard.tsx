import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { projectAction } from './projectAction';
import { formatLanguagePair, formatRelativeDate, getProjectStatusLabel, isProcessingStatus } from './projectUtils';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import type { Project } from './types';

export function ProjectCard({ project }: { project: Project }) {
  const action = projectAction(project);
  const showProgress = isProcessingStatus(project.status) && project.progress !== undefined;
  const workflowPath = action.step === 'result' ? '/projects/[projectId]/result' : action.step === 'generate' ? '/projects/[projectId]/generate' : '/projects/[projectId]/transcript';
  return <Card padding="sm" accessibilityLabel={`${project.name}, ${formatLanguagePair(project)}, ${getProjectStatusLabel(project.status)}`}>
    <View style={styles.header}><View style={styles.titleGroup}><View style={styles.mediaIcon}><MaterialCommunityIcons name={project.mediaType === 'VIDEO' ? 'video-outline' : 'waveform'} size={20} color={colors.primary} /></View><View style={styles.titleText}><Text numberOfLines={2} style={styles.title}>{project.name}</Text><Text style={styles.meta}>{formatLanguagePair(project)} · {project.mediaType === 'VIDEO' ? 'Video' : project.mediaType === 'AUDIO' ? 'Âm thanh' : 'Chưa có phương tiện'}</Text></View></View><ProjectStatusBadge status={project.status} /></View>
    {showProgress && <View style={styles.progress}><ProgressBar value={project.progress ?? 0} label="Tiến độ" /></View>}
    <Text style={styles.updated}>Cập nhật {formatRelativeDate(project.updatedAt)}</Text>
    <View accessibilityRole="toolbar" accessibilityLabel={`Thao tác cho dự án ${project.name}`} style={styles.actions}><Button accessibilityLabel={`Xem chi tiết ${project.name}`} size="sm" variant="secondary" onPress={() => router.push(`/projects/${project.id}`)}>Chi tiết</Button><Button accessibilityLabel={`${action.label} cho ${project.name}`} size="sm" onPress={() => router.push({ pathname: workflowPath, params: { projectId: project.id, ...(project.targetLanguage ? { language: project.targetLanguage } : {}) } })}>{action.label}</Button></View>
  </Card>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }, titleGroup: { minWidth: 220, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, mediaIcon: { width: 40, height: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, borderRadius: radius.md }, titleText: { minWidth: 0, flex: 1 }, title: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold }, meta: { marginTop: 2, color: colors.textMuted, fontSize: 12, lineHeight: 18 }, progress: { marginTop: spacing.md }, updated: { marginTop: spacing.md, color: colors.textMuted, fontSize: 12 }, actions: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md } });
