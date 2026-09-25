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

export function GenerateScreen({ projectId, language }: { projectId: string; language?: string }) {
  const project = projectRepository.getById(projectId);
  if (!project || (language !== undefined && !isLanguageCode(language))) return <View style={styles.container}><MobileHeader title="AI Narrator" />
    <MobileScreen title="Generate Narration"><Card><ErrorState title={project ? 'Language unavailable' : 'Project not found'} description="Open a saved Voice configuration to begin." /></Card>
      <Button onPress={() => router.replace('/projects')}>Back to Projects</Button>
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
  const failedStage = snapshot?.error?.stage === 'start' ? 'Start generation' : snapshot?.stages.find((stage) => stage.id === snapshot?.error?.stage)?.title;
  return <View style={styles.container}><MobileHeader title="AI Narrator" />
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <MobileScreen title="Generate Narration" description="Review your settings before starting the processing simulation."
        action={<Button variant="ghost" size="sm" disabled={busy} onPress={() => edit('voice')}>Back to Voice Settings</Button>}>
        <View style={styles.heading}><Text style={styles.projectName}>{project.name}</Text><Badge variant="info">SIMULATION</Badge></View>
        <WorkflowSteps current="generate" />
        {processing.loadStatus === 'LOADING' && <Card style={styles.center}><Spinner label="Loading generation settings" /><Text style={styles.note}>Loading saved generation settings...</Text></Card>}
        {processing.loadStatus === 'FAILED' && <Card><ErrorState title="Unable to load generation settings" description={processing.error ?? 'Please retry.'} onRetry={processing.reload} /></Card>}
        {processing.loadStatus === 'READY' && !context && <Card><EmptyState title="Saved voice configuration required"
          description="Save a valid translation, voice and speech speed before generating."
          action={<Button onPress={() => edit('voice')}>Back to Voice Settings</Button>} /></Card>}
        {context && snapshot && <>
          <Card style={styles.card}><Text style={styles.sectionTitle}>Generation Summary</Text>
            <SummaryRow label="Project" value={context.project.name} />
            <SummaryRow label="Source language" value={languageNames[context.transcript.languageCode]} />
            <SummaryRow label="Target language" value={languageNames[context.translation.targetLanguage]} />
            <SummaryRow label="Transcript" value={context.transcript.segments.length + ' segments'} />
            <SummaryRow label="Translation" value={context.translation.segments.length + ' segments'} />
            <SummaryRow label="Voice" value={context.voice.name} />
            <SummaryRow label="Speech speed" value={formatSpeed(context.config.speed)} />
            <SummaryRow label="Media" value={(context.project.mediaName ?? 'Saved mock media reference') + ' (' + context.project.mediaType.toLowerCase() + ')'} />
            <View style={styles.actions}><Button variant="secondary" disabled={busy} onPress={() => edit('translation')}>Edit Translation</Button><Button variant="secondary" disabled={busy} onPress={() => edit('voice')}>Edit Voice</Button></View>
            <Text style={styles.note}>This demo simulates progress only. It does not create narration audio or a processed media file.</Text>
            {snapshot.status === 'WAITING' && <>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }}
                accessibilityLabel="I reviewed the language, voice and speech speed"
                onPress={() => setConfirmed((value) => !value)} style={styles.confirmation}>
                <Text style={styles.check}>{confirmed ? '☑' : '☐'}</Text><Text style={styles.confirmationText}>I reviewed the language, voice and speech speed.</Text>
              </Pressable>
              <Button disabled={!confirmed} onPress={processing.start}>{project.mediaType === 'VIDEO' ? 'Generate Video' : 'Generate Audio'}</Button>
            </>}
          </Card>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>{snapshot.status === 'COMPLETED' ? 'Processing Complete' : snapshot.status === 'FAILED' ? 'Processing Failed' : snapshot.status === 'CANCELLED' ? 'Processing Cancelled' : 'Processing Pipeline'}</Text>
            <Badge variant={snapshot.status === 'COMPLETED' ? 'success' : snapshot.status === 'FAILED' ? 'error' : 'info'}>{snapshot.status}</Badge>
            <Text style={styles.note}>Simulated project status: {getSimulatedProjectStatus(snapshot, project.mediaType)}</Text>
            <ProgressBar value={snapshot.progress} label="Overall processing progress" />
            <Text accessibilityLiveRegion="polite" style={styles.message}>{snapshot.message}</Text>
            {snapshot.stages.map((stage) => <ProcessingStage key={stage.id} stage={stage} />)}
            {busy && <><Text style={styles.note}>Keep this screen open during the demo. Leaving cancels the simulation.</Text>
              <Button variant="secondary" onPress={processing.cancel}>Cancel Processing</Button></>}
            {snapshot.status === 'FAILED' && <View style={styles.outcome}>
              <Text accessibilityRole="alert" style={styles.error}>Processing Failed</Text>
              <Text style={styles.note}>Stage: {failedStage ?? 'Generation'}</Text><Text style={styles.note}>{snapshot.error?.message}</Text>
              <Button onPress={processing.retry}>Retry Processing</Button><Text style={styles.note}>Retry restarts both generation stages from 0%.</Text>
            </View>}
            {snapshot.status === 'CANCELLED' && <View style={styles.outcome}><Button onPress={processing.retry}>Restart Generation</Button><Text style={styles.note}>Restart begins both simulated stages from 0%.</Text></View>}
            {snapshot.status === 'COMPLETED' && <View style={styles.outcome}><Text style={styles.sectionTitle}>All demo stages completed</Text>
              <Text style={styles.note}>No output file was generated.</Text><Button onPress={() => router.replace({ pathname: '/projects/[projectId]/result', params: { projectId: project.id, language: target } })}>View Result</Button>
              <Text style={styles.note}>View the mock result metadata; no real media is available.</Text>
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
