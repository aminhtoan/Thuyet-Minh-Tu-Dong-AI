import { router } from 'expo-router';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { TranslationSegmentCard } from '@/features/translation/TranslationSegmentCard';
import { useTranslationEditor } from '@/features/translation/useTranslationEditor';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export function TranslationScreen({ projectId, language }: { projectId: string; language?: string }) {
  const { project, isLoading, error } = useProject(projectId);
  if (isLoading) return <View style={styles.container}><Spinner label="Đang tải dự án" /></View>;
  if (error) return <View style={styles.container}><ErrorState title="Không thể tải dự án" description={error} /></View>;
  if (!project) return <View style={styles.container}><MobileHeader title="Người kể chuyện AI" />
    <MobileScreen title="Bản dịch" description="Không tìm thấy dự án">
      <Card><ErrorState title="Không tìm thấy dự án" description="Dự án này không khả dụng." /></Card>
      <Button onPress={() => router.replace('/projects')}>Quay lại danh sách dự án</Button>
    </MobileScreen></View>;
  const preferredTarget = language && isLanguageCode(language) ? language : project.targetLanguage ?? '';
  return <TranslationWorkspace key={project.id + preferredTarget} project={project} preferredTarget={preferredTarget} />;
}

function TranslationWorkspace({ project, preferredTarget }: { project: Project; preferredTarget: LanguageCode }) {
  const editor = useTranslationEditor(project.id, preferredTarget);
  const sourceLanguage = editor.transcript?.languageCode ?? project.sourceLanguage;
  const translationBySource = new Map(editor.draft?.segments.map((segment) => [segment.transcriptSegmentId, segment]));
  const goBack = () => router.replace({ pathname: '/projects/[projectId]/transcript', params: { projectId: project.id } });
  function backToTranscript() {
    if (editor.dirty) Alert.alert('Thay đổi chưa lưu', 'Hủy thay đổi bản dịch và quay lại Bản ghi?', [
      { text: 'Tiếp tục chỉnh sửa', style: 'cancel' },
      { text: 'Hủy thay đổi', style: 'destructive', onPress: goBack },
    ]);
    else goBack();
  }
  const sourceVisible = editor.transcript && editor.status !== 'LOADING';
  const header = <View style={styles.header}>
    <View style={styles.heading}><View style={styles.headingText}>
      <Text style={styles.title}>Bản dịch</Text><Text style={styles.projectName}>{project.name}</Text>
    </View><Button size="sm" variant="ghost" disabled={editor.busy} onPress={backToTranscript}>Quay lại bản ghi</Button></View>
    <Text style={styles.note}>So sánh nội dung gốc và kiểm tra từng đoạn đã dịch.</Text>
    <WorkflowSteps current="translation" />
    <Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{editor.status.replace('_', ' ')}</Badge>
    {editor.status === 'FAILED' && <Card><ErrorState
      title={editor.failedAction === 'save' ? 'Không thể lưu bản dịch' : editor.failedAction === 'load' ? 'Không thể tải bản dịch' : 'Không thể dịch bản ghi'}
      description={editor.error ?? 'Vui lòng thử lại.'} onRetry={editor.retry} /></Card>}
    {sourceVisible && <Card style={styles.languageCard}>
      <Text style={styles.label}>Ngôn ngữ nguồn</Text><Text style={styles.sourceLanguage}>{languageNames[sourceLanguage]}</Text>
      <Text style={styles.label}>Ngôn ngữ đích</Text>
      <View style={styles.languageOptions} accessibilityRole="radiogroup" accessibilityLabel="Ngôn ngữ đích">
        {editor.targetChoices.map((language) => <Pressable key={language.code}
          accessibilityRole="radio" accessibilityLabel={'Ngôn ngữ đích: ' + language.name}
          accessibilityState={{ checked: editor.targetLanguage === language.code, disabled: !editor.canChangeTarget }}
          disabled={!editor.canChangeTarget} onPress={() => editor.changeTarget(language.code)}
          style={[styles.languageOption, editor.targetLanguage === language.code && styles.selectedLanguage, !editor.canChangeTarget && styles.disabled]}>
          <Text style={styles.languageText}>{language.nativeName}</Text><Text style={styles.note}>{language.name}</Text>
        </Pressable>)}
      </View>
      <Text style={styles.note}>Chọn ngôn ngữ để tạo hoặc mở lại bản dịch đã lưu.</Text>
      <Text style={styles.note}>Bản dịch được tạo và lưu bởi backend.</Text>
      {!editor.draft && <Button loading={editor.status === 'TRANSLATING'} disabled={editor.busy || editor.status === 'FAILED'} onPress={editor.translate}>Dịch</Button>}
    </Card>}
    {editor.status === 'TRANSLATING' && <Card style={styles.loading}><Spinner label="Đang dịch bản ghi" />
      <Text accessibilityLiveRegion="polite" style={styles.note}>Đang tạo bản dịch {editor.targetLanguage ? languageNames[editor.targetLanguage] : ''}...</Text></Card>}
    {sourceVisible && !editor.draft && editor.status === 'NOT_STARTED' && <Text style={styles.note}>Chưa có bản dịch đã lưu cho ngôn ngữ và bản ghi này. Chọn Dịch để bắt đầu.</Text>}
  </View>;

  const empty = editor.status === 'LOADING' ? <Card style={styles.loading}><Spinner label="Đang tải bản dịch" />
    <Text style={styles.note}>Đang tải bản ghi và bản dịch...</Text></Card> : editor.status === 'NOT_STARTED' && !editor.transcript ?
    <Card><EmptyState title="Cần có bản ghi trước khi dịch" description="Hãy tạo, kiểm tra và lưu bản ghi trước."
      action={<Button onPress={backToTranscript}>Quay lại bản ghi</Button>} /></Card> : null;

  const footer = editor.draft && sourceVisible ? <Card style={styles.actions}>
    <Text accessibilityLiveRegion="polite" style={styles.label}>Bản dịch được lưu bởi backend. Chỉnh sửa hiện chưa được hỗ trợ.</Text>
    <Button variant="secondary" disabled={!editor.saved || editor.dirty || editor.invalid || editor.busy || editor.status === 'FAILED'} onPress={() => { if (editor.targetLanguage) router.replace({ pathname: '/projects/[projectId]/voice', params: { projectId: project.id, language: editor.targetLanguage } }); }}>Tiếp tục chọn giọng đọc</Button>
    <Text style={styles.note}>Hãy lưu mọi thay đổi bản dịch trước khi chọn giọng đọc thuyết minh.</Text>
  </Card> : null;

  return <View style={styles.container}><MobileHeader title="Người kể chuyện AI" />
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FlatList data={sourceVisible ? editor.transcript?.segments : []} keyExtractor={(segment) => segment.id}
          contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          ListHeaderComponent={header} ListEmptyComponent={empty} ListFooterComponent={footer}
          ItemSeparatorComponent={SegmentSeparator} renderItem={({ item }) => {
            const translation = translationBySource.get(item.id);
            return <TranslationSegmentCard source={item} translation={translation}
              error={translation ? editor.errors[translation.id] : undefined} disabled onChange={editor.updateSegment} />;
          }} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  </View>;
}

function SegmentSeparator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.md, paddingBottom: spacing.md },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  headingText: { flexShrink: 1, gap: spacing.xs },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: '700' },
  projectName: { color: colors.textPrimary, fontSize: typography.size.lg },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: '600' },
  note: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21 },
  sourceLanguage: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: '600' },
  languageCard: { gap: spacing.sm },
  languageOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  languageOption: { minHeight: 64, minWidth: 88, justifyContent: 'center', padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  selectedLanguage: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  languageText: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '600' },
  disabled: { opacity: 0.65 },
  loading: { gap: spacing.md, alignItems: 'center' },
  actions: { gap: spacing.md, marginTop: spacing.md },
  separator: { height: spacing.md },
  error: { color: colors.error, fontSize: typography.size.sm },
});
