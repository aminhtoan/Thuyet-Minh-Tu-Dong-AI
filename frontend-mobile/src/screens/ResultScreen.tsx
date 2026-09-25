import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { Spinner } from '@/components/common/Spinner';
import { WorkflowSteps } from '@/components/common/WorkflowSteps';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileScreen } from '@/components/layout/MobileScreen';
import { projectRepository } from '@/features/projects/projectRepository';
import { isLanguageCode } from '@/features/projects/languages';
import { useResult } from '@/features/results/useResult';
import { resultRows } from '@/features/results/resultUtils';
import { downloadUnavailable } from '@/features/results/resultService';
import { colors, spacing } from '@/theme/tokens';

export function ResultScreen({ projectId, language }: { projectId: string; language?: string }) {
  const project = projectRepository.getById(projectId);
  const { result, loading, error, reload } = useResult(projectId, isLanguageCode(language ?? '') ? language as 'vi' | 'en' | 'ja' | 'ko' : undefined);
  const valid = language === undefined || isLanguageCode(language);
  return <View style={styles.root}><MobileHeader title="AI Narrator" /><SafeAreaView style={styles.root} edges={['bottom']}><MobileScreen title="Result" description="Kết quả mô phỏng — chưa có media thực.">
    {!project || !valid ? <ErrorState title={!project ? 'Project not found' : 'Language unavailable'} description="Vui lòng mở dự án từ danh sách." /> : loading ? <Spinner label="Loading result" /> : error ? <ErrorState title="Không tải được kết quả" description={error} onRetry={reload} /> : !result ? <Card><Text style={styles.title}>Result not ready</Text><Text>Dự án chưa hoàn tất mô phỏng cho ngôn ngữ này.</Text><Button onPress={() => router.replace({ pathname: '/projects/[projectId]/generate', params: { projectId, ...(language ? { language } : {}) } })}>Continue processing</Button></Card> : <>
      <WorkflowSteps current="result" /><Card style={styles.card}><Text style={styles.title}>{project.name}</Text><Text>MOCK_PREVIEW · Metadata ready</Text>{resultRows(project, result).map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}<Text style={styles.title}>Processing Summary</Text><Text>Narration generation: Completed (simulated)</Text><Text>{result.mediaType === 'VIDEO' ? 'Video' : 'Audio'} processing: Completed (simulated)</Text></Card>
      <View style={styles.preview}><Text style={styles.previewTitle}>{result.mediaType === 'VIDEO' ? 'Video' : 'Audio'} Preview</Text><Text style={styles.light}>Preview chưa khả dụng. Mô phỏng không tạo file; đây không phải media gốc hay kết quả có thể phát.</Text></View><Text style={styles.label}>{downloadUnavailable}</Text><Button disabled>Download {result.mediaType === 'VIDEO' ? 'Video' : 'Audio'}</Button>
    </>}
    <Button variant="secondary" onPress={() => router.replace('/projects')}>Back to Projects</Button><Button onPress={() => router.replace('/history')}>View History</Button>
  </MobileScreen></SafeAreaView></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, card: { gap: spacing.md }, title: { color: colors.textPrimary, fontSize: 20, fontWeight: '600' }, row: { flexDirection: 'row', gap: spacing.md }, label: { flex: 1, color: colors.textSecondary }, value: { flex: 1.4, color: colors.textPrimary }, preview: { backgroundColor: '#142033', borderRadius: 12, minHeight: 230, padding: spacing.lg, justifyContent: 'center', gap: spacing.md }, previewTitle: { color: '#fff', fontSize: 20, fontWeight: '600' }, light: { color: '#fff', lineHeight: 24 } });
