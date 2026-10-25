import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { Spinner } from '@/components/common/Spinner';
import { WorkflowSteps } from '@/components/common/WorkflowSteps';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileScreen } from '@/components/layout/MobileScreen';
import { useResult } from '@/features/results/useResult';
import { ResultPlayer } from '@/features/results/ResultPlayer';
import { resultRows } from '@/features/results/resultUtils';
import { resultService } from '@/features/results/resultService';
import type { Result } from '@/features/results/types';
import { session } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export function ResultScreen({ projectId, language }: { projectId: string; language?: string }) {
  const { project, result, source, loading, error, blocked, reload } = useResult(projectId, language);
  return <View style={styles.root}><MobileHeader title="Thuyết minh bảo tàng" back /><SafeAreaView style={styles.root} edges={['bottom']}><MobileScreen title="Kết quả" description="Xem và tải tệp thuyết minh do máy chủ tạo.">
    {loading ? <Spinner label="Đang tải kết quả" /> : error ? <ErrorState title="Không tải được kết quả" description={error} onRetry={reload} /> : blocked ? <Card><View style={styles.card}><Text accessibilityRole="header" style={styles.title}>Bước này chưa thể mở an toàn</Text><Text style={styles.text}>{blocked}</Text><Text style={styles.text}>Không có tác vụ xử lý nào được tạo hoặc thử lại khi bạn mở liên kết này.</Text><Button onPress={() => router.replace({ pathname: '/projects/[projectId]', params: { projectId } })}>Xem chi tiết dự án</Button></View></Card>
      : !project || !result ? <Card><Text style={styles.title}>Kết quả chưa sẵn sàng</Text><Text style={styles.text}>Máy chủ chưa trả về tệp kết quả đã được xác nhận cho ngôn ngữ này.</Text></Card> : <>
        <WorkflowSteps current="result" /><Card><View style={styles.card}><View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>{project.name}</Text><Badge variant="success">Hoàn thành</Badge></View><Text style={styles.text}>TỆP KẾT QUẢ · Dữ liệu thực từ máy chủ</Text>{resultRows(project, result).map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}<Text accessibilityRole="header" style={styles.title}>Tóm tắt xử lý</Text><Text style={styles.text}>Tạo giọng đọc: Hoàn thành</Text><Text style={styles.text}>{result.artifactType === 'VIDEO' ? 'Ghép video: Hoàn thành' : 'Âm thanh thuyết minh: Sẵn sàng'}</Text></View></Card>
        <Card><View style={styles.card}><Text accessibilityRole="header" style={styles.title}>Xem trước {result.artifactType === 'VIDEO' ? 'video' : 'âm thanh'}</Text>{source ? <ResultPlayer key={`${projectId}:${result.id}:${result.languageCode}`} source={source} video={result.artifactType === 'VIDEO'} /> : <Spinner label="Đang tải tệp kết quả được bảo vệ" />}<ResultDownload key={result.id} result={result} /></View></Card>
      </>}
    <Button variant="secondary" onPress={() => router.replace('/projects')}>Quay lại dự án</Button><Button onPress={() => router.replace('/library')}>Xem thư viện</Button>
  </MobileScreen></SafeAreaView></View>;
}
export function ResultDownload({ result }: { result: Result }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const lock = useRef(false), active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  return <View style={styles.card}>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Button loading={busy} wrapLabel accessibilityLabel="Tải tệp kết quả về thiết bị" onPress={async () => {
      if (lock.current) return;
      lock.current = true; setBusy(true); setError(null);
      const revision = session.getRevision(); let localUri: string | null = null;
      try {
        if (!await Sharing.isAvailableAsync()) throw new Error();
        localUri = await resultService.downloadProtected(result);
        if (!active.current || revision !== session.getRevision()) return;
        // Native save/export sheet is the platform equivalent of Web download.
        await Sharing.shareAsync(localUri, { mimeType: result.mimeType, dialogTitle: 'Lưu tệp thuyết minh' });
      } catch { if (active.current) setError('Không thể tải hoặc lưu tệp kết quả. Vui lòng thử lại.'); }
      finally { if (localUri) await resultService.cleanup(localUri).catch(() => undefined); lock.current = false; if (active.current) setBusy(false); }
    }}>Tải xuống {result.artifactType === 'VIDEO' ? 'video' : 'âm thanh'}</Button>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, card: { gap: spacing.md }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, title: { flexShrink: 1, color: colors.textPrimary, fontFamily: typography.family.semibold, fontSize: typography.size.lg, lineHeight: 26 }, text: { color: colors.textSecondary, fontFamily: typography.family.regular, lineHeight: 22 }, row: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, label: { flex: 1, color: colors.textSecondary, fontFamily: typography.family.regular, lineHeight: 22 }, value: { flex: 1.4, minWidth: 0, color: colors.textPrimary, fontFamily: typography.family.regular, textAlign: 'right', lineHeight: 22 }, error: { color: colors.error, fontFamily: typography.family.regular, lineHeight: 22 } });
