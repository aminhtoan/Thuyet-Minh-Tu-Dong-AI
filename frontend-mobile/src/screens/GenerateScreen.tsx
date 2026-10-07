import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Spinner } from '@/components/common/Spinner';
import { WorkflowSteps } from '@/components/common/WorkflowSteps';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileScreen } from '@/components/layout/MobileScreen';
import { isLanguageCode } from '@/features/projects/languages';
import { projectRepository } from '@/features/projects/projectRepository';
import { languageNames } from '@/features/projects/projectUtils';
import type { LanguageCode, Project } from '@/features/projects/types';
import { ProcessingStage } from '@/features/processing/ProcessingStage';
import { getSimulatedProjectStatus } from '@/features/processing/processingUtils';
import { useProcessing } from '@/features/processing/useProcessing';
import { formatSpeed } from '@/features/voice/voiceUtils';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { getDisplayStatus } from '@/utils/displayLabels';

export function GenerateScreen({ projectId, language }: { projectId: string; language?: string }) {
  const project = projectRepository.getById(projectId);
  if (!project || (language !== undefined && !isLanguageCode(language))) return <View style={styles.container}><MobileHeader title="Người kể chuyện AI" />
    <MobileScreen title="Tạo thuyết minh"><Card><ErrorState title={project ? 'Ngôn ngữ không khả dụng' : 'Không tìm thấy dự án'} description="Mở một cấu hình giọng đọc đã lưu để bắt đầu." /></Card>
      <Button onPress={() => router.replace('/projects')}>Quay lại danh sách dự án</Button>
    </MobileScreen></View>;
  return <GenerateWorkspace key={project.id + (language ?? '')} project={project} language={language} />;
}

function GenerateWorkspace({ project, language }: { project: Project; language?: LanguageCode }) {
  const processing = useProcessing(project.id, language);
  const [confirmed, setConfirmed] = useState(false);
  const { context, snapshot, busy, cancel } = processing;
  // Also stop if a stack screen loses focus without being unmounted.
  useFocusEffect(useCallback(() => () => cancel(), [cancel]));
  const target = context?.config.languageCode ?? language;
  function edit(destination: 'voice' | 'translation') {
    if (busy) return;
    router.replace({ pathname: destination === 'voice' ? '/projects/[projectId]/voice' : '/projects/[projectId]/translation',
      params: { projectId: project.id, ...(target ? { language: target } : {}) } });
  }
  const failedStage = snapshot?.error?.stage === 'start' ? 'Bắt đầu tạo thuyết minh' : snapshot?.stages.find((stage) => stage.id === snapshot?.error?.stage)?.title;
  return <View style={styles.container}><MobileHeader title="Người kể chuyện AI" />
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <MobileScreen title="Tạo thuyết minh" description="Kiểm tra cấu hình trước khi bắt đầu mô phỏng xử lý."
        action={<Button variant="ghost" size="sm" disabled={busy} onPress={() => edit('voice')}>Quay lại cấu hình giọng đọc</Button>}>
        <View style={styles.heading}><Text style={styles.projectName}>{project.name}</Text><Badge variant="info">MÔ PHỎNG</Badge></View>
        <WorkflowSteps current="generate" />
        {processing.loadStatus === 'LOADING' && <Card style={styles.center}><Spinner label="Đang tải cấu hình tạo thuyết minh" /><Text style={styles.note}>Đang tải cấu hình đã lưu...</Text></Card>}
        {processing.loadStatus === 'FAILED' && <Card><ErrorState title="Không thể tải cấu hình tạo thuyết minh" description={processing.error ?? 'Vui lòng thử lại.'} onRetry={processing.reload} /></Card>}
        {processing.loadStatus === 'READY' && !context && <Card><EmptyState title="Cần có cấu hình giọng đọc đã lưu"
          description="Hãy lưu bản dịch, giọng đọc và tốc độ đọc hợp lệ trước khi tạo."
          action={<Button onPress={() => edit('voice')}>Quay lại cấu hình giọng đọc</Button>} /></Card>}
        {context && snapshot && <>
          <Card style={styles.card}><Text style={styles.sectionTitle}>Tóm tắt cấu hình</Text>
            <SummaryRow label="Dự án" value={context.project.name} />
            <SummaryRow label="Ngôn ngữ nguồn" value={languageNames[context.transcript.languageCode]} />
            <SummaryRow label="Ngôn ngữ đích" value={languageNames[context.translation.targetLanguage]} />
            <SummaryRow label="Bản ghi" value={context.transcript.segments.length + ' phân đoạn'} />
            <SummaryRow label="Bản dịch" value={context.translation.segments.length + ' phân đoạn'} />
            <SummaryRow label="Giọng đọc" value={context.voice.name} />
            <SummaryRow label="Tốc độ đọc" value={formatSpeed(context.config.speed)} />
            <SummaryRow label="Phương tiện" value={(context.project.mediaName ?? 'Tham chiếu phương tiện mô phỏng đã lưu') + ' (' + (context.project.mediaType === 'VIDEO' ? 'video' : 'âm thanh') + ')'} />
            <View style={styles.actions}><Button variant="secondary" disabled={busy} onPress={() => edit('translation')}>Chỉnh sửa bản dịch</Button><Button variant="secondary" disabled={busy} onPress={() => edit('voice')}>Chỉnh sửa giọng đọc</Button></View>
            <Text style={styles.note}>Bản dùng thử chỉ mô phỏng tiến độ, không tạo âm thanh thuyết minh hoặc tệp phương tiện đã xử lý.</Text>
            {snapshot.status === 'WAITING' && <>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }}
                accessibilityLabel="Tôi đã kiểm tra ngôn ngữ, giọng đọc và tốc độ đọc"
                onPress={() => setConfirmed((value) => !value)} style={styles.confirmation}>
                <Text style={styles.check}>{confirmed ? '☑' : '☐'}</Text><Text style={styles.confirmationText}>Tôi đã kiểm tra ngôn ngữ, giọng đọc và tốc độ đọc.</Text>
              </Pressable>
              <Button disabled={!confirmed} onPress={processing.start}>{project.mediaType === 'VIDEO' ? 'Tạo video' : 'Tạo giọng đọc'}</Button>
            </>}
          </Card>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>{snapshot.status === 'COMPLETED' ? 'Xử lý hoàn tất' : snapshot.status === 'FAILED' ? 'Xử lý thất bại' : snapshot.status === 'CANCELLED' ? 'Đã hủy xử lý' : 'Quy trình xử lý'}</Text>
            <Badge variant={snapshot.status === 'COMPLETED' ? 'success' : snapshot.status === 'FAILED' ? 'error' : 'info'}>{snapshot.status}</Badge>
            <Text style={styles.note}>Trạng thái dự án mô phỏng: {getDisplayStatus(getSimulatedProjectStatus(snapshot, project.mediaType))}</Text>
            <ProgressBar value={snapshot.progress} label="Tiến độ xử lý tổng thể" />
            <Text accessibilityLiveRegion="polite" style={styles.message}>{snapshot.message}</Text>
            {snapshot.stages.map((stage) => <ProcessingStage key={stage.id} stage={stage} />)}
            {busy && <><Text style={styles.note}>Hãy giữ màn hình này mở trong khi mô phỏng. Rời màn hình sẽ hủy quá trình.</Text>
              <Button variant="secondary" onPress={processing.cancel}>Hủy xử lý</Button></>}
            {snapshot.status === 'FAILED' && <View style={styles.outcome}>
              <Text accessibilityRole="alert" style={styles.error}>Xử lý thất bại</Text>
              <Text style={styles.note}>Giai đoạn: {failedStage ?? 'Tạo thuyết minh'}</Text><Text style={styles.note}>{snapshot.error?.message}</Text>
              <Button onPress={processing.retry}>Thử xử lý lại</Button><Text style={styles.note}>Thử lại sẽ khởi động hai giai đoạn từ 0%.</Text>
            </View>}
            {snapshot.status === 'CANCELLED' && <View style={styles.outcome}><Button onPress={processing.retry}>Khởi động lại</Button><Text style={styles.note}>Quá trình mô phỏng sẽ bắt đầu lại từ 0%.</Text></View>}
            {snapshot.status === 'COMPLETED' && <View style={styles.outcome}><Text style={styles.sectionTitle}>Đã hoàn tất mọi giai đoạn mô phỏng</Text>
              <Text style={styles.note}>Không có tệp đầu ra nào được tạo.</Text><Button onPress={() => router.replace({ pathname: '/projects/[projectId]/result', params: { projectId: project.id, language: target } })}>Xem kết quả</Button>
              <Text style={styles.note}>Xem siêu dữ liệu kết quả mô phỏng; chưa có phương tiện thực.</Text>
            </View>}
          </Card>
        </>}
      </MobileScreen>
    </SafeAreaView>
  </View>;
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.summaryRow}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  projectName: { flexShrink: 1, color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: '600' },
  card: { gap: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  label: { flex: 1, color: colors.textSecondary, fontSize: typography.size.sm },
  value: { flex: 1.3, color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: '600' },
  note: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21 },
  center: { alignItems: 'center', gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  confirmation: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  check: { color: colors.primary, fontSize: 26 },
  confirmationText: { flex: 1, color: colors.textPrimary, fontSize: typography.size.sm, lineHeight: 21 },
  message: { color: colors.textPrimary, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, fontSize: typography.size.sm, lineHeight: 21 },
  outcome: { gap: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  error: { color: colors.error, fontSize: typography.size.lg, fontWeight: '600' },
});
