import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Spinner } from '@/components/common/Spinner';
import { WorkflowSteps } from '@/components/common/WorkflowSteps';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileScreen } from '@/components/layout/MobileScreen';
import { formatFileSize } from '@/features/projects/mediaUpload';
import { useProject } from '@/features/projects/useProjects';
import { languageNames } from '@/features/projects/projectUtils';
import type { Project } from '@/features/projects/types';
import { projectRepository } from '@/features/projects/projectRepository';
import { TranscriptSegmentEditor } from '@/features/transcript/TranscriptSegmentEditor';
import { formatTimestamp } from '@/features/transcript/transcriptUtils';
import { useTranscriptEditor } from '@/features/transcript/useTranscriptEditor';
import { deriveTranscriptStage } from '@/features/transcript/transcriptWorkflow.mjs';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export function TranscriptScreen({ projectId }: { projectId: string }) {
  const { project, isLoading, error } = useProject(projectId);
  if (isLoading) return <View style={styles.container}><Spinner label="Đang tải dự án" /></View>;
  if (error) return <View style={styles.container}><ErrorState title="Không thể tải dự án" description={error} /></View>;
  if (!project) return <View style={styles.container}><MobileHeader title="Người kể chuyện AI" /><MobileScreen title="Bản ghi" description="Không tìm thấy dự án" action={<Button size="sm" variant="ghost" onPress={() => router.replace('/projects')}>Quay lại danh sách dự án</Button>}><Card><ErrorState title="Không tìm thấy dự án" description="Dự án không tồn tại hoặc bạn không có quyền truy cập." /></Card></MobileScreen></View>;
  return <TranscriptWorkspace key={projectId} project={project} />;
}

function TranscriptWorkspace({ project }: { project: Project }) {
  const editor = useTranscriptEditor(project.id);
  const canContinue = Boolean(editor.draft && !editor.dirty && !editor.hasInvalidSegments && (editor.status === 'SAVED' || editor.status === 'READY'));
  const stage = deriveTranscriptStage(project.status, editor.status, Boolean(editor.draft));
  const hasSourceMedia = Boolean(project.mediaName && project.mediaType);
  const canGenerate = hasSourceMedia && ['UPLOADED', 'FAILED', 'TRANSCRIBED'].includes(project.status);
  const serverProcessing = project.status === 'TRANSCRIBING' && !editor.draft;
  const retry = editor.failedAction === 'load' ? editor.retryLoad : editor.failedAction === 'save' ? editor.saveTranscript : editor.generate;
  const segments = editor.status === 'LOADING' || editor.status === 'GENERATING' || serverProcessing ? [] : editor.draft?.segments ?? [];
  const previousProjectStatus = useRef(project.status);

  useEffect(() => {
    if (project.status !== 'TRANSCRIBING') return;
    let polling = false;
    const timer = setInterval(() => {
      if (polling) return;
      polling = true;
      void projectRepository.getProject(project.id).catch(() => undefined).finally(() => { polling = false; });
    }, 2500);
    return () => clearInterval(timer);
  }, [project.id, project.status]);

  useEffect(() => {
    if (previousProjectStatus.current === 'TRANSCRIBING' && project.status === 'TRANSCRIBED' && !editor.draft) editor.retryLoad();
    previousProjectStatus.current = project.status;
  }, [editor, project.status]);

  const header = <View style={styles.header}><View style={styles.pageHeading}><View style={styles.pageText}><Text style={styles.eyebrow}>KHÔNG GIAN DỰ ÁN</Text><Text style={styles.title}>Bản ghi</Text><Text style={styles.description}>Xem các phân đoạn có mốc thời gian do máy chủ tạo.</Text></View><Button size="sm" variant="ghost" onPress={() => router.replace('/projects')}>Quay lại danh sách</Button></View><View style={styles.projectRow}><View style={styles.projectText}><Text style={styles.projectName}>{project.name}</Text><Text style={styles.muted}>Ngôn ngữ nguồn: {languageNames[project.sourceLanguage] ?? project.sourceLanguage}</Text></View><Badge variant={stage === 'TRANSCRIBED' ? 'success' : stage === 'FAILED' ? 'error' : 'info'}>{stage}</Badge></View><WorkflowSteps current="transcript" /><Card style={styles.mediaCard}><View style={styles.mediaHeading}><MaterialCommunityIcons name={project.mediaType === 'VIDEO' ? 'video-outline' : 'waveform'} size={26} color={colors.primary} /><Text style={styles.sectionTitle}>Phương tiện nguồn</Text></View><Text style={styles.mediaName}>{project.mediaName ?? 'Chưa có phương tiện'}</Text><Text style={styles.muted}>{project.mediaType === 'VIDEO' ? 'Video' : project.mediaType === 'AUDIO' ? 'Âm thanh' : 'Chưa xác định'} · {languageNames[project.sourceLanguage] ?? project.sourceLanguage}{project.mediaSize ? ` · ${formatFileSize(project.mediaSize)}` : ''}{project.durationSeconds ? ` · ${formatTimestamp(project.durationSeconds)}` : ''}</Text><Text style={styles.mediaNote}>Bản ghi được tạo từ phương tiện đã tải lên máy chủ.</Text></Card><View style={styles.transcriptHeading}><View style={styles.transcriptHeadingText}><Text style={styles.sectionTitle}>Các đoạn bản ghi</Text><Text style={styles.muted}>{editor.draft ? `${editor.draft.segments.length} đoạn có mốc thời gian` : 'Tạo bản ghi để bắt đầu.'}</Text></View><Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{editor.status}</Badge></View>{editor.status === 'FAILED' && editor.draft && <Card><ErrorState title={editor.failedAction === 'save' ? 'Không thể lưu bản ghi' : 'Lỗi bản ghi'} description={editor.error ?? 'Vui lòng thử lại.'} onRetry={retry} retryLabel="Thử lại" /></Card>}</View>;

  const empty = editor.status === 'LOADING' ? <Card style={styles.center}><Spinner size="large" label="Đang tải bản ghi" /><Text style={styles.muted}>Đang tải bản ghi...</Text></Card> : editor.status === 'GENERATING' || serverProcessing ? <Card style={styles.center}><Spinner size="large" label="Đang tạo bản ghi" /><Text style={styles.sectionTitle}>Đang tạo bản ghi...</Text><Text style={styles.muted}>Dịch vụ nhận dạng giọng nói đang xử lý phương tiện. Trạng thái sẽ tự động cập nhật.</Text></Card> : editor.status === 'FAILED' && !editor.draft ? <Card><ErrorState title={editor.failedAction === 'load' ? 'Không thể tải bản ghi' : 'Không thể tạo bản ghi'} description={editor.error ?? 'Vui lòng thử lại.'} onRetry={retry} retryLabel="Thử lại" /></Card> : <Card><EmptyState title={editor.draft ? 'Không có đoạn bản ghi' : 'Chưa có bản ghi'} description={editor.draft ? 'Bản ghi hiện chưa có phân đoạn.' : canGenerate ? 'Phương tiện đã sẵn sàng để tạo bản ghi.' : 'Hãy tải phương tiện lên trước khi tạo bản ghi.'} action={canGenerate ? <Button onPress={editor.generate}>Tạo bản ghi</Button> : undefined} /></Card>;

  const footer = editor.draft && editor.draft.segments.length > 0 && editor.status !== 'LOADING' && editor.status !== 'GENERATING' ? <Card style={styles.actions}><Text accessibilityRole="text" style={styles.actionStatus}>Bản ghi được lưu trên máy chủ. Chỉnh sửa hiện chưa được hỗ trợ.</Text><Button variant="secondary" disabled={!canContinue} onPress={() => router.replace({ pathname: '/projects/[projectId]/translation', params: { projectId: project.id } })}>Tiếp tục dịch thuật</Button></Card> : undefined;

  return <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><MobileHeader title="Người kể chuyện AI" /><SafeAreaView edges={['bottom']} style={styles.container}><FlatList style={styles.list} contentContainerStyle={styles.listContent} data={segments} keyExtractor={(item) => item.id} renderItem={({ item }) => <TranscriptSegmentEditor segment={item} error={editor.segmentErrors[item.id]} disabled onChange={editor.updateSegment} />} ItemSeparatorComponent={() => <View style={styles.separator} />} ListHeaderComponent={header} ListEmptyComponent={empty} ListFooterComponent={footer} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" /></SafeAreaView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, list: { flex: 1 }, listContent: { padding: spacing.md, paddingBottom: spacing.xl + 24 },
  header: { gap: spacing.md, marginBottom: spacing.md }, pageHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }, pageText: { minWidth: 210, flex: 1, gap: spacing.xs }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: typography.weight.bold, letterSpacing: 1 }, title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold }, description: { color: colors.textSecondary, fontSize: typography.size.sm }, projectRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, projectText: { minWidth: 200, flex: 1, gap: spacing.xs }, projectName: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, muted: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 20 }, steps: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, stepDone: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, color: colors.success, backgroundColor: colors.successLight, fontSize: 12 }, stepActive: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, color: colors.primary, backgroundColor: colors.primaryLight, fontSize: 12, fontWeight: typography.weight.semibold }, stepNext: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, color: colors.textMuted, backgroundColor: colors.surfaceSecondary, fontSize: 12 }, mediaCard: { gap: spacing.sm }, mediaHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, sectionTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, mediaName: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold }, mediaNote: { padding: spacing.md, borderRadius: radius.md, color: colors.textSecondary, backgroundColor: colors.surfaceSecondary, fontSize: typography.size.sm, lineHeight: 20 }, transcriptHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }, transcriptHeadingText: { minWidth: 190, flex: 1 }, center: { alignItems: 'center', gap: spacing.md }, separator: { height: spacing.md }, actions: { gap: spacing.md, marginTop: spacing.md }, actionStatus: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold }, error: { color: colors.error, fontSize: typography.size.sm }, actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
