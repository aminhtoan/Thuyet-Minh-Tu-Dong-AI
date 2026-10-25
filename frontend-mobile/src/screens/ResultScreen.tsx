import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useAudioPlayer } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { Spinner } from '@/components/common/Spinner';
import { WorkflowSteps } from '@/components/common/WorkflowSteps';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileScreen } from '@/components/layout/MobileScreen';
import { useProject } from '@/features/projects/useProjects';
import { isLanguageCode } from '@/features/projects/languages';
import { useResult } from '@/features/results/useResult';
import { resultRows } from '@/features/results/resultUtils';
import { colors, spacing } from '@/theme/tokens';

export function ResultScreen({ projectId, language }: { projectId: string; language?: string }) {
  const [shareError, setShareError] = useState<string | null>(null);
  const { project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const { result, localUri, loading, error, reload } = useResult(projectId, isLanguageCode(language ?? '') ? language : undefined);
  const valid = language === undefined || isLanguageCode(language);
  return <View style={styles.root}><MobileHeader title="Người kể chuyện AI" /><SafeAreaView style={styles.root} edges={['bottom']}><MobileScreen title="Kết quả" description="Phát và tải tệp thuyết minh từ máy chủ.">
    {projectLoading ? <Spinner label="Đang tải dự án" /> : projectError ? <ErrorState title="Không thể tải dự án" description={projectError} /> : !project || !valid ? <ErrorState title={!project ? 'Không tìm thấy dự án' : 'Ngôn ngữ không khả dụng'} description="Vui lòng mở dự án từ danh sách." /> : loading ? <Spinner label="Đang tải kết quả" /> : error ? <ErrorState title="Không tải được kết quả" description={error} onRetry={reload} /> : !result ? <Card><Text style={styles.title}>Kết quả chưa sẵn sàng</Text><Text>Dự án chưa có tệp kết quả cho ngôn ngữ này.</Text><Button onPress={() => router.replace({ pathname: '/projects/[projectId]/generate', params: { projectId, ...(language ? { language } : {}) } })}>Tiếp tục xử lý</Button></Card> : <>
      <WorkflowSteps current="result" /><Card style={styles.card}><View style={styles.heading}><Text style={styles.title}>{project.name}</Text><Badge variant="success">Hoàn thành</Badge></View><Text>TỆP KẾT QUẢ · Dữ liệu thực từ máy chủ</Text>{resultRows(project, result).map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}</Card>
      {localUri ? <ArtifactPreview uri={localUri} video={result.artifactType === 'VIDEO'} /> : <Spinner label="Đang tải tệp được bảo vệ" />}
      {shareError ? <Text accessibilityRole="alert" style={styles.error}>{shareError}</Text> : null}
      <Button disabled={!localUri} accessibilityLabel="Lưu hoặc chia sẻ tệp kết quả" onPress={async () => { if (!localUri) return; setShareError(null); try { if (!await Sharing.isAvailableAsync()) throw new Error(); await Sharing.shareAsync(localUri, { mimeType: result.mimeType, dialogTitle: 'Lưu hoặc chia sẻ kết quả' }); } catch { setShareError('Không thể mở bảng chia sẻ. Vui lòng thử lại.'); } }}>Tải xuống / chia sẻ</Button>
    </>}
    <Button variant="secondary" onPress={() => router.replace('/projects')}>Quay lại dự án</Button><Button onPress={() => router.replace('/history')}>Xem lịch sử</Button>
  </MobileScreen></SafeAreaView></View>;
}
function ArtifactPreview({ uri, video }: { uri: string; video: boolean }) { return video ? <VideoArtifact uri={uri} /> : <AudioArtifact uri={uri} />; }
function VideoArtifact({ uri }: { uri: string }) { const player = useVideoPlayer(uri); return <VideoView player={player} nativeControls style={styles.preview} />; }
function AudioArtifact({ uri }: { uri: string }) { const player = useAudioPlayer(uri); return <View style={styles.preview}><Text style={styles.previewTitle}>Âm thanh thuyết minh</Text><Button onPress={() => player.play()}>Phát âm thanh</Button><Button variant="secondary" onPress={() => player.pause()}>Tạm dừng</Button></View>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, card: { gap: spacing.md }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, title: { flexShrink: 1, color: colors.textPrimary, fontSize: 20, fontWeight: '600' }, row: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, label: { flex: 1, color: colors.textSecondary }, value: { flex: 1.4, color: colors.textPrimary, textAlign: 'right' }, preview: { backgroundColor: '#142033', borderRadius: 12, minHeight: 230, padding: spacing.lg, justifyContent: 'center', gap: spacing.md }, previewTitle: { color: '#fff', fontSize: 20, fontWeight: '600' }, light: { color: '#fff', lineHeight: 24 }, error: { color: colors.error } });
