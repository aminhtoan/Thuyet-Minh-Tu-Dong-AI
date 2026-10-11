import { router } from 'expo-router';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
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
import { isLanguageCode } from '@/features/projects/languages';
import { useProject } from '@/features/projects/useProjects';
import { languageNames } from '@/features/projects/projectUtils';
import type { LanguageCode, Project } from '@/features/projects/types';
import { VoiceCard } from '@/features/voice/VoiceCard';
import { useVoiceEditor } from '@/features/voice/useVoiceEditor';
import { formatSpeed, speedPresets, voiceFilters } from '@/features/voice/voiceUtils';
import { voiceStatusLabels } from '@/localization/statusLabels.mjs';
import { colors, spacing, typography } from '@/theme/tokens';

export function VoiceScreen({ projectId, language }: { projectId: string; language?: string }) {
  const { project, isLoading, error } = useProject(projectId);
  if (isLoading) return <View style={styles.container}><Spinner label="Đang tải dự án" /></View>;
  if (error) return <View style={styles.container}><ErrorState title="Không thể tải dự án" description={error} /></View>;
  if (!project || (language !== undefined && !isLanguageCode(language))) return <View style={styles.container}><MobileHeader title="Người kể chuyện AI" />
    <MobileScreen title="Giọng đọc và thuyết minh" description="Hãy mở một bản dịch đã lưu trước.">
      <Card><ErrorState title={project ? 'Ngôn ngữ không khả dụng' : 'Không tìm thấy dự án'} description="Quay lại danh sách dự án và mở một bản dịch đã lưu." /></Card>
      <Button onPress={() => router.replace('/projects')}>Quay lại danh sách dự án</Button>
    </MobileScreen></View>;
  return <VoiceWorkspace key={project.id + (language ?? '')} project={project} language={language} />;
}

function VoiceWorkspace({ project, language }: { project: Project; language?: LanguageCode }) {
  const editor = useVoiceEditor(project.id, language);
  const target = editor.translation?.targetLanguage ?? language;
  const goBack = () => router.replace({ pathname: '/projects/[projectId]/translation', params: { projectId: project.id, ...(target ? { language: target } : {}) } });
  function backToTranslation() {
    editor.stopPreview();
    if (editor.dirty) Alert.alert('Thay đổi chưa lưu', 'Hủy thay đổi cấu hình giọng đọc và quay lại Bản dịch?', [
      { text: 'Tiếp tục chỉnh sửa', style: 'cancel' }, { text: 'Hủy thay đổi', style: 'destructive', onPress: goBack },
    ]);
    else goBack();
  }
  const characterCount = editor.translation?.segments.reduce((count, segment) => count + segment.translatedText.length, 0) ?? 0;
  const showConfiguration = editor.translation && editor.draft && editor.status !== 'LOADING';
  const header = <View style={styles.header}>
    <View style={styles.heading}><Text style={styles.title}>Giọng đọc và thuyết minh</Text>
      <Button size="sm" variant="ghost" disabled={editor.busy} onPress={backToTranslation}>Quay lại bản dịch</Button></View>
    <Text style={styles.projectName}>{project.name}</Text>
    <Text style={styles.note}>Chọn giọng đọc và thiết lập cách đọc cho nội dung đã dịch.</Text>
    <WorkflowSteps current="voice" />
    <Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{voiceStatusLabels[editor.status]}</Badge>
    {editor.status === 'FAILED' && <Card><ErrorState title={editor.failedAction === 'save' ? 'Không thể lưu cấu hình' : 'Không thể tải giọng đọc'} description={editor.error ?? 'Vui lòng thử lại.'} onRetry={editor.retry} /></Card>}
    {showConfiguration && editor.translation && <>
      <Card style={styles.summary}><Text style={styles.label}>Ngôn ngữ thuyết minh</Text>
        <Text style={styles.sectionTitle}>{languageNames[editor.translation.targetLanguage]}</Text>
        <Text style={styles.note}>{editor.translation.segments.length} phân đoạn · {characterCount} ký tự</Text>
        <Text numberOfLines={5} style={styles.description}>{editor.translation.segments.slice(0, 2).map((segment) => segment.translatedText).join(' ')}</Text>
      </Card>
      <Text style={styles.sectionTitle}>Chọn giọng đọc</Text>
      <View style={styles.controls} accessibilityLabel="Lọc giọng đọc theo giới tính">
        {voiceFilters.map((gender) => <Button key={gender} variant={editor.gender === gender ? 'primary' : 'secondary'}
          accessibilityState={{ selected: editor.gender === gender }} onPress={() => editor.setGender(gender)}>{gender === 'All' ? 'Tất cả' : gender === 'Female' ? 'Nữ' : gender === 'Male' ? 'Nam' : 'Trung tính'}</Button>)}
      </View>
    </>}
    {editor.previewError && <Card><ErrorState title="Không thể nghe thử giọng đọc" description={editor.previewError}
      onRetry={() => { if (editor.failedPreviewId) void editor.preview(editor.failedPreviewId); }} /></Card>}
  </View>;

  const empty = editor.status === 'LOADING' ? <Card style={styles.loading}><Spinner label="Đang tải giọng đọc" /><Text style={styles.note}>Đang tải giọng đọc và cấu hình...</Text></Card>
    : !editor.translation && editor.status !== 'FAILED' ? <Card><EmptyState title="Cần có bản dịch trước khi chọn giọng đọc."
      description="Hãy kiểm tra và lưu các phân đoạn đã dịch trước." action={<Button onPress={backToTranslation}>Quay lại bản dịch</Button>} /></Card>
    : showConfiguration ? <Card><EmptyState title={editor.voices.length ? 'Không có giọng đọc phù hợp với bộ lọc.' : 'Hiện chưa có giọng đọc cho ' + (target ? languageNames[target] : 'ngôn ngữ này') + '.'}
      description={editor.voices.length ? 'Hãy chọn bộ lọc giới tính khác.' : 'Quay lại Bản dịch để chọn một ngôn ngữ đã lưu khác.'}
      action={editor.voices.length ? <Button onPress={() => editor.setGender('All')}>Xóa bộ lọc</Button> : <Button onPress={backToTranslation}>Quay lại bản dịch</Button>} /></Card> : null;

  const footer = showConfiguration && editor.draft ? <View style={styles.footer}>
    <Card style={styles.summary}><Text style={styles.sectionTitle}>Tốc độ giọng đọc</Text>
      <Text style={styles.label}>Hiện tại: {formatSpeed(editor.draft.speed)}</Text>
      <View style={styles.controls} accessibilityLabel="Tốc độ giọng đọc">
        {speedPresets.filter((speed) => speed === 1).map((speed) => <Button key={speed} variant="primary"
          disabled accessibilityLabel={'Tốc độ giọng đọc ' + formatSpeed(speed)}
          accessibilityState={{ selected: editor.draft?.speed === speed, disabled: editor.busy }}
          onPress={() => editor.updateConfig({ speed })}>{formatSpeed(speed)}</Button>)}
      </View><Text style={styles.note}>Máy chủ hiện hỗ trợ tốc độ đọc cố định 1.0x.</Text>
    </Card>
    <Card style={styles.summary}><Text style={styles.sectionTitle}>Cấu hình thuyết minh</Text>
      <Text style={styles.description}>Ngôn ngữ: {languageNames[editor.draft.languageCode]}</Text>
      <Text style={styles.description}>Giọng đọc: {editor.selectedVoice?.name ?? 'Chưa chọn'}</Text>
      <Text style={styles.description}>Tốc độ: {formatSpeed(editor.draft.speed)}</Text>
      {editor.validationError && <Text accessibilityLiveRegion="polite" style={styles.error}>{editor.validationError}</Text>}
      <Text accessibilityLiveRegion="polite" style={styles.label}>{editor.status === 'SAVING' ? 'Đang lưu cấu hình...' : editor.dirty ? 'Thay đổi chưa lưu' : editor.saved ? 'Đã lưu' : 'Chọn giọng đọc để cấu hình thuyết minh.'}</Text>
      <Button loading={editor.status === 'SAVING'} disabled={!editor.canSave} onPress={editor.save}>Tạo giọng đọc</Button>
      <Button variant="secondary" disabled={!editor.dirty || editor.busy} onPress={editor.reset}>Đặt lại thay đổi</Button>
      <Button variant="secondary" disabled={!editor.saved || editor.dirty || editor.busy || Boolean(editor.validationError) || editor.status === 'FAILED'} onPress={() => { if (target) { editor.stopPreview(); router.replace({ pathname: '/projects/[projectId]/generate', params: { projectId: project.id, language: target } }); } }}>Tiếp tục tạo thuyết minh</Button>
      <Text style={styles.note}>Tạo giọng đọc sẽ gọi dịch vụ TTS sau khi bạn xác nhận.</Text>
    </Card>
  </View> : null;

  return <View style={styles.container}><MobileHeader title="Người kể chuyện AI" />
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <FlatList data={showConfiguration ? editor.visibleVoices : []} keyExtractor={(voice) => voice.id}
        contentContainerStyle={styles.content} ListHeaderComponent={header} ListEmptyComponent={empty}
        ListFooterComponent={footer} ItemSeparatorComponent={VoiceSeparator}
        renderItem={({ item }) => <VoiceCard voice={item} selected={editor.draft?.voiceId === item.id}
          previewing={editor.previewingVoiceId === item.id} disabled={editor.busy}
          onPreview={() => editor.preview(item.id)} onSelect={() => editor.updateConfig({ voiceId: item.id })} />}
      />
    </SafeAreaView>
  </View>;
}
function VoiceSeparator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.md, paddingBottom: spacing.md },
  heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: '700', flexShrink: 1 },
  projectName: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: '600' },
  note: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21 },
  description: { color: colors.textPrimary, fontSize: typography.size.md, lineHeight: 24 },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: '600' },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: '600' },
  summary: { gap: spacing.md },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  loading: { gap: spacing.md, alignItems: 'center' },
  footer: { gap: spacing.md, marginTop: spacing.md },
  separator: { height: spacing.md },
  error: { color: colors.error, fontSize: typography.size.sm },
});
