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
import { projectRepository } from '@/features/projects/projectRepository';
import { languageNames } from '@/features/projects/projectUtils';
import type { LanguageCode, Project } from '@/features/projects/types';
import { VoiceCard } from '@/features/voice/VoiceCard';
import { useVoiceEditor } from '@/features/voice/useVoiceEditor';
import { formatSpeed, speedPresets, voiceFilters } from '@/features/voice/voiceUtils';
import { colors, spacing, typography } from '@/theme/tokens';

export function VoiceScreen({ projectId, language }: { projectId: string; language?: string }) {
  const project = projectRepository.getById(projectId);
  if (!project || (language !== undefined && !isLanguageCode(language))) return <View style={styles.container}><MobileHeader title="AI Narrator" />
    <MobileScreen title="Voice & Narration" description="Open a saved translation first.">
      <Card><ErrorState title={project ? 'Language unavailable' : 'Project not found'} description="Return to Projects and open a saved translation." /></Card>
      <Button onPress={() => router.replace('/projects')}>Back to Projects</Button>
    </MobileScreen></View>;
  return <VoiceWorkspace key={project.id + (language ?? '')} project={project} language={language} />;
}

function VoiceWorkspace({ project, language }: { project: Project; language?: LanguageCode }) {
  const editor = useVoiceEditor(project.id, language);
  const target = editor.translation?.targetLanguage ?? language;
  const goBack = () => router.replace({ pathname: '/projects/[projectId]/translation', params: { projectId: project.id, ...(target ? { language: target } : {}) } });
  function backToTranslation() {
    editor.stopPreview();
    if (editor.dirty) Alert.alert('Unsaved changes', 'Discard voice configuration changes and return to Translation?', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Discard changes', style: 'destructive', onPress: goBack },
    ]);
    else goBack();
  }
  const characterCount = editor.translation?.segments.reduce((count, segment) => count + segment.translatedText.length, 0) ?? 0;
  const showConfiguration = editor.translation && editor.draft && editor.status !== 'LOADING';
  const header = <View style={styles.header}>
    <View style={styles.heading}><Text style={styles.title}>Voice & Narration</Text>
      <Button size="sm" variant="ghost" disabled={editor.busy} onPress={backToTranslation}>Back to Translation</Button></View>
    <Text style={styles.projectName}>{project.name}</Text>
    <Text style={styles.note}>Choose a voice and speech settings for your translated content.</Text>
    <WorkflowSteps current="voice" />
    <Badge variant={editor.status === 'SAVED' ? 'success' : editor.status === 'FAILED' ? 'error' : 'info'}>{editor.status}</Badge>
    {editor.status === 'FAILED' && <Card><ErrorState title={editor.failedAction === 'save' ? 'Unable to save configuration' : 'Unable to load voices'} description={editor.error ?? 'Please retry.'} onRetry={editor.retry} /></Card>}
    {showConfiguration && editor.translation && <>
      <Card style={styles.summary}><Text style={styles.label}>Narration language</Text>
        <Text style={styles.sectionTitle}>{languageNames[editor.translation.targetLanguage]}</Text>
        <Text style={styles.note}>{editor.translation.segments.length} segments · {characterCount} characters</Text>
        <Text numberOfLines={5} style={styles.description}>{editor.translation.segments.slice(0, 2).map((segment) => segment.translatedText).join(' ')}</Text>
      </Card>
      <Text style={styles.sectionTitle}>Choose Voice</Text>
      <View style={styles.controls} accessibilityLabel="Filter voices by gender">
        {voiceFilters.map((gender) => <Button key={gender} variant={editor.gender === gender ? 'primary' : 'secondary'}
          accessibilityState={{ selected: editor.gender === gender }} onPress={() => editor.setGender(gender)}>{gender}</Button>)}
      </View>
    </>}
    {editor.previewError && <Card><ErrorState title="Unable to preview voice" description={editor.previewError}
      onRetry={() => { if (editor.failedPreviewId) void editor.preview(editor.failedPreviewId); }} /></Card>}
  </View>;

  const empty = editor.status === 'LOADING' ? <Card style={styles.loading}><Spinner label="Loading voices" /><Text style={styles.note}>Loading voices and configuration...</Text></Card>
    : !editor.translation && editor.status !== 'FAILED' ? <Card><EmptyState title="Translation required before selecting a voice."
      description="Review and save your translated segments first." action={<Button onPress={backToTranslation}>Back to Translation</Button>} /></Card>
    : showConfiguration ? <Card><EmptyState title={editor.voices.length ? 'No voices match your filters.' : 'No voices are currently available for ' + (target ? languageNames[target] : 'this language') + '.'}
      description={editor.voices.length ? 'Choose another gender filter.' : 'Return to Translation to review another saved language.'}
      action={editor.voices.length ? <Button onPress={() => editor.setGender('All')}>Clear filters</Button> : <Button onPress={backToTranslation}>Back to Translation</Button>} /></Card> : null;

  const footer = showConfiguration && editor.draft ? <View style={styles.footer}>
    <Card style={styles.summary}><Text style={styles.sectionTitle}>Speech Speed</Text>
      <Text style={styles.label}>Current: {formatSpeed(editor.draft.speed)}</Text>
      <View style={styles.controls} accessibilityLabel="Speech speed">
        {speedPresets.map((speed) => <Button key={speed} variant={editor.draft?.speed === speed ? 'primary' : 'secondary'}
          disabled={editor.busy} accessibilityLabel={'Speech speed ' + formatSpeed(speed)}
          accessibilityState={{ selected: editor.draft?.speed === speed, disabled: editor.busy }}
          onPress={() => editor.updateConfig({ speed })}>{formatSpeed(speed)}</Button>)}
      </View><Text style={styles.note}>Slower speeds create longer narration. Faster speeds create shorter narration.</Text>
    </Card>
    <Card style={styles.summary}><Text style={styles.sectionTitle}>Narration Configuration</Text>
      <Text style={styles.description}>Language: {languageNames[editor.draft.languageCode]}</Text>
      <Text style={styles.description}>Voice: {editor.selectedVoice?.name ?? 'Not selected'}</Text>
      <Text style={styles.description}>Speed: {formatSpeed(editor.draft.speed)}</Text>
      {editor.validationError && <Text accessibilityLiveRegion="polite" style={styles.error}>{editor.validationError}</Text>}
      <Text accessibilityLiveRegion="polite" style={styles.label}>{editor.status === 'SAVING' ? 'Saving configuration...' : editor.dirty ? 'Unsaved changes' : editor.saved ? 'Saved' : 'Choose a voice to configure narration.'}</Text>
      <Button loading={editor.status === 'SAVING'} disabled={!editor.canSave} onPress={editor.save}>Save Configuration</Button>
      <Button variant="secondary" disabled={!editor.dirty || editor.busy} onPress={editor.reset}>Reset Changes</Button>
      <Button variant="secondary" disabled={!editor.saved || editor.dirty || editor.busy || Boolean(editor.validationError) || editor.status === 'FAILED'} onPress={() => { if (target) { editor.stopPreview(); router.replace({ pathname: '/projects/[projectId]/generate', params: { projectId: project.id, language: target } }); } }}>Continue to Generate</Button>
      <Text style={styles.note}>Save all configuration changes before continuing. The next step simulates processing.</Text>
    </Card>
  </View> : null;

  return <View style={styles.container}><MobileHeader title="AI Narrator" />
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <FlatList data={showConfiguration ? editor.visibleVoices : []} keyExtractor={(voice) => voice.id}
        contentContainerStyle={styles.content} ListHeaderComponent={header} ListEmptyComponent={empty}
        ListFooterComponent={footer} ItemSeparatorComponent={VoiceSeparator}
        renderItem={({ item }) => <VoiceCard voice={item} selected={editor.draft?.voiceId === item.id}
          previewing={editor.previewingVoiceId === item.id} disabled={editor.busy}
          onPreview={() => void editor.preview(item.id)} onSelect={() => editor.updateConfig({ voiceId: item.id })} />}
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
