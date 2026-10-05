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
  return <View style={styles.root}><MobileHeader title="Người kể chuyện AI" /><SafeAreaView style={styles.root} edges={['bottom']}><MobileScreen title="Kết quả" description="Kết quả mô phỏng — chưa có phương tiện thực.">
    {!project || !valid ? <ErrorState title={!project ? 'Không tìm thấy dự án' : 'Ngôn ngữ không khả dụng'} description="Vui lòng mở dự án từ danh sách." /> : loading ? <Spinner label="Đang tải kết quả" /> : error ? <ErrorState title="Không tải được kết quả" description={error} onRetry={reload} /> : !result ? <Card><Text style={styles.title}>Kết quả chưa sẵn sàng</Text><Text>Dự án chưa hoàn tất mô phỏng cho ngôn ngữ này.</Text><Button onPress={() => router.replace({ pathname: '/projects/[projectId]/generate', params: { projectId, ...(language ? { language } : {}) } })}>Tiếp tục xử lý</Button></Card> : <>
      <WorkflowSteps current="result" /><Card style={styles.card}><Text style={styles.title}>{project.name}</Text><Text>XEM TRƯỚC MÔ PHỎNG · Siêu dữ liệu đã sẵn sàng</Text>{resultRows(project, result).map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}<Text style={styles.title}>Tóm tắt xử lý</Text><Text>Tạo thuyết minh: Hoàn thành (mô phỏng)</Text><Text>Xử lý {result.mediaType === 'VIDEO' ? 'video' : 'âm thanh'}: Hoàn thành (mô phỏng)</Text></Card>
      <View style={styles.preview}><Text style={styles.previewTitle}>Xem trước {result.mediaType === 'VIDEO' ? 'video' : 'âm thanh'}</Text><Text style={styles.light}>Bản xem trước chưa khả dụng. Mô phỏng không tạo tệp; đây không phải phương tiện gốc hay kết quả có thể phát.</Text></View><Text style={styles.label}>{downloadUnavailable}</Text><Button disabled>Tải xuống {result.mediaType === 'VIDEO' ? 'video' : 'âm thanh'}</Button>
    </>}
    <Button variant="secondary" onPress={() => router.replace('/projects')}>Quay lại dự án</Button><Button onPress={() => router.replace('/history')}>Xem lịch sử</Button>
  </MobileScreen></SafeAreaView></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, card: { gap: spacing.md }, title: { color: colors.textPrimary, fontSize: 20, fontWeight: '600' }, row: { flexDirection: 'row', gap: spacing.md }, label: { flex: 1, color: colors.textSecondary }, value: { flex: 1.4, color: colors.textPrimary }, preview: { backgroundColor: '#142033', borderRadius: 12, minHeight: 230, padding: spacing.lg, justifyContent: 'center', gap: spacing.md }, previewTitle: { color: '#fff', fontSize: 20, fontWeight: '600' }, light: { color: '#fff', lineHeight: 24 } });
