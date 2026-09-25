import { useRef } from 'react';
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
import { filterTargetLanguages } from '@/features/projects/languages';
import { projectRepository } from '@/features/projects/projectRepository';
import { languageNames } from '@/features/projects/projectUtils';
import type { Project } from '@/features/projects/types';
import type { TranscriptSegment } from '@/features/transcript/types';
import { TranslationSegmentCard } from '@/features/translation/TranslationSegmentCard';
import { useTranslationEditor } from '@/features/translation/useTranslationEditor';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export function TranslationScreen({ projectId }: { projectId: string }) {
  const project = projectRepository.getById(projectId);
  if (!project) return <View style={styles.container}><MobileHeader title="AI Narrator" />
    <MobileScreen title="Translation" description="Project not found">
      <Card><ErrorState title="Project not found" description="This project is not available." /></Card>
      <Button onPress={() => router.replace('/projects')}>Back to Projects</Button>
    </MobileScreen></View>;
  return <TranslationWorkspace key={project.id} project={project} />;
}

function TranslationWorkspace({ project }: { project: Project }) {
  const editor = useTranslationEditor(project.id, project.targetLanguage);
  const list = useRef<FlatList<TranscriptSegment>>(null);
  const sourceLanguage = editor.transcript?.languageCode ?? project.sourceLanguage;
  const translationBySource = new Map(editor.draft?.segments.map((segment) => [segment.transcriptSegmentId, segment]));
  const goBack = () => router.replace({ pathname: '/projects/[projectId]/transcript', params: { projectId: project.id } });
  function backToTranscript() {
    if (editor.dirty) Alert.alert('Unsaved changes', 'Discard translation changes and return to Transcript?', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard changes', style: 'destructive', onPress: goBack },
    ]);
    else goBack();
  }
  const sourceVisible = editor.transcript && editor.status !== 'LOADING';
  const header = <View style={styles.header}>
    <View style={styles.heading}><View style={styles.headingText}>
      <Text style={styles.title}>Translation</Text><Text style={styles.projectName}>{project.name}</Text>
    </View><Button size="sm" variant="ghost" disabled={editor.busy} onPress={backToTranscript}>Back to Transcript</Button></View>
    <Text style={styles.note}>Compare the original and review each translated segment.</Text>
    <WorkflowSteps current="translation" />
    <Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{editor.status.replace('_', ' ')}</Badge>
    {editor.status === 'FAILED' && <Card><ErrorState
      title={editor.failedAction === 'save' ? 'Unable to save translation' : editor.failedAction === 'load' ? 'Unable to load translation' : 'Unable to translate transcript'}
      description={editor.error ?? 'Please try again.'} onRetry={editor.retry} /></Card>}
    {sourceVisible && <Card style={styles.languageCard}>
      <Text style={styles.label}>Source language</Text><Text style={styles.sourceLanguage}>{languageNames[sourceLanguage]}</Text>
      <Text style={styles.label}>Target language</Text>
      <View style={styles.languageOptions} accessibilityRole="radiogroup" accessibilityLabel="Target language">
        {filterTargetLanguages(sourceLanguage).map((language) => <Pressable key={language.code}
          accessibilityRole="radio" accessibilityLabel={'Target language: ' + language.name}
          accessibilityState={{ checked: editor.targetLanguage === language.code, disabled: !editor.canChangeTarget }}
          disabled={!editor.canChangeTarget} onPress={() => editor.changeTarget(language.code)}
          style={[styles.languageOption, editor.targetLanguage === language.code && styles.selectedLanguage, !editor.canChangeTarget && styles.disabled]}>
          <Text style={styles.languageText}>{language.nativeName}</Text><Text style={styles.note}>{language.name}</Text>
        </Pressable>)}
      </View>
      <Text style={styles.note}>{editor.dirty ? 'Save or reset changes before choosing another language.' : 'Choose a language to create or reopen its translation.'}</Text>
      <Text style={styles.note}>Demo translation uses fixed samples. Edited source text receives labelled sample content.</Text>
      {!editor.draft && <Button loading={editor.status === 'TRANSLATING'} disabled={editor.busy || editor.status === 'FAILED'} onPress={editor.translate}>Translate</Button>}
    </Card>}
    {editor.status === 'TRANSLATING' && <Card style={styles.loading}><Spinner label="Translating transcript" />
      <Text accessibilityLiveRegion="polite" style={styles.note}>Translating transcript... Preparing {editor.targetLanguage ? languageNames[editor.targetLanguage] : ''} sample translation.</Text></Card>}
    {sourceVisible && !editor.draft && editor.status === 'NOT_STARTED' && <Text style={styles.note}>No saved translation for this language and transcript. Select Translate to begin.</Text>}
  </View>;

  const empty = editor.status === 'LOADING' ? <Card style={styles.loading}><Spinner label="Loading translation" />
    <Text style={styles.note}>Loading transcript and translation...</Text></Card> : editor.status === 'NOT_STARTED' && !editor.transcript ?
    <Card><EmptyState title="Transcript required before translation" description="Generate, review and save your transcript first."
      action={<Button onPress={backToTranscript}>Back to Transcript</Button>} /></Card> : null;

  const footer = editor.draft && sourceVisible ? <Card style={styles.actions}>
    <Text accessibilityLiveRegion="polite" style={styles.label}>{editor.status === 'SAVING' ? 'Saving translation...' : editor.dirty ? 'Unsaved changes' : 'Saved'}</Text>
    {editor.invalid && <Text accessibilityRole="alert" style={styles.error}>Correct empty translations before saving.</Text>}
    <Button loading={editor.status === 'SAVING'} disabled={!editor.canSave} onPress={editor.save}>Save Translation</Button>
    <Button variant="secondary" disabled={!editor.canReset} onPress={() => {
      editor.reset();
      if (!editor.saved) list.current?.scrollToOffset({ offset: 0, animated: true });
    }}>Reset Changes</Button>
    <Text style={styles.note}>{editor.saved ? 'Reset restores your last saved translation.' : 'Reset discards this unsaved translation so you can start again or change language.'}</Text>
    <Button variant="secondary" disabled>Continue to Voice / TTS</Button>
    <Text style={styles.note}>Voice and TTS will be available in the next step.</Text>
  </Card> : null;

  return <View style={styles.container}><MobileHeader title="AI Narrator" />
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FlatList ref={list} data={sourceVisible ? editor.transcript?.segments : []} keyExtractor={(segment) => segment.id}
          contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          ListHeaderComponent={header} ListEmptyComponent={empty} ListFooterComponent={footer}
          ItemSeparatorComponent={SegmentSeparator} renderItem={({ item }) => {
            const translation = translationBySource.get(item.id);
            return <TranslationSegmentCard source={item} translation={translation}
              error={translation ? editor.errors[translation.id] : undefined} disabled={editor.busy} onChange={editor.updateSegment} />;
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
