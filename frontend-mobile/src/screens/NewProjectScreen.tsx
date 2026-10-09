import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { ProgressBar } from '@/components/common/ProgressBar';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileScreen } from '@/components/layout/MobileScreen';
import { formatFileSize, MAX_MEDIA_FILE_SIZE, validateMediaFile, validateProjectName, type UploadStatus } from '@/features/projects/mediaUpload';
import { uploadProjectMedia } from '@/features/projects/uploadService';
import { sourceLanguageOptions } from '@/features/projects/projectUtils';
import type { LanguageCode } from '@/features/projects/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export function NewProjectScreen() {
  const [projectName, setProjectName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode | null>(null);
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const validation = validateMediaFile(file);
  const nameError = validateProjectName(projectName);
  const busy = status === 'validating' || status === 'uploading';
  const canUpload = !nameError && sourceLanguage && validation.valid && !busy && status !== 'success';
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function chooseFile() {
    if (busy || status === 'success') return;
    setPickerError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['video/*', 'audio/*'], multiple: false, copyToCacheDirectory: true });
      if (result.canceled) return;
      const picked = result.assets?.[0];
      if (!picked) { setPickerError('Chưa chọn tệp. Vui lòng thử lại.'); return; }
      setFile(picked);
      setStatus('selected');
      setProgress(0);
      setUploadError(null);
    } catch {
      setPickerError('Không thể mở danh sách tệp. Vui lòng thử lại.');
    }
  }

  function removeFile() {
    if (busy) return;
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setPickerError(null);
    setUploadError(null);
  }

  async function startUpload() {
    setNameTouched(true);
    const result = validateMediaFile(file);
    if (nameError || !sourceLanguage || !result.valid || !file || busy) return;
    setStatus('validating');
    setUploadError(null);
    setProgress(0);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      setStatus('uploading');
      const projectId = await uploadProjectMedia({ projectName: projectName.trim(), sourceLanguage, file, signal: controller.signal, onProgress: setProgress });
      if (!controller.signal.aborted) setStatus('success');
      if (!controller.signal.aborted) router.replace(`/projects/${projectId}`);
    } catch (error) {
      if (controller.signal.aborted) setStatus('cancelled');
      else { setStatus('failed'); setUploadError(error instanceof Error ? error.message : 'Tải lên thất bại. Vui lòng thử lại.'); }
    } finally { if (controllerRef.current === controller) controllerRef.current = null; }
  }

  function cancelUpload() { controllerRef.current?.abort(); setStatus('cancelled'); }

  return <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <MobileHeader title="Người kể chuyện AI" />
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <MobileScreen title="Dự án mới" description="Nhập thông tin dự án và chọn video hoặc âm thanh để bắt đầu." action={<Button size="sm" variant="ghost" onPress={() => router.replace('/projects')}>Quay lại danh sách dự án</Button>} contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag">
        <Card style={styles.section}>
          <View style={styles.heading}><Text style={styles.step}>01</Text><View style={styles.headingText}><Text style={styles.sectionTitle}>Thông tin dự án</Text><Text style={styles.muted}>Đặt tên dự án và chọn ngôn ngữ được sử dụng trong phương tiện.</Text></View></View>
          <Input label="Tên dự án" required placeholder="Ví dụ: Giới thiệu sản phẩm" value={projectName} onChangeText={setProjectName} onBlur={() => setNameTouched(true)} maxLength={100} returnKeyType="done" error={nameTouched ? nameError ?? undefined : undefined} helperText="Có ít nhất 3 ký tự." editable={!busy && status !== 'success'} />
          <Text style={styles.fieldLabel}>Ngôn ngữ nguồn <Text style={styles.required}>*</Text></Text>
          <View style={styles.languageRow}>{sourceLanguageOptions.map(({ value, label }) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Ngôn ngữ nguồn ${label}`} accessibilityState={{ selected: sourceLanguage === value, disabled: busy || status === 'success' }} disabled={busy || status === 'success'} onPress={() => setSourceLanguage(value)} style={[styles.languageChip, sourceLanguage === value && styles.languageChipSelected]}><Text style={[styles.languageText, sourceLanguage === value && styles.languageTextSelected]}>{label}</Text></Pressable>)}</View>
        </Card>
        <Card style={styles.section}>
          <View style={styles.heading}><Text style={styles.step}>02</Text><View style={styles.headingText}><Text style={styles.sectionTitle}>Tệp phương tiện</Text><Text style={styles.muted}>MP4, MOV, WEBM, MP3, WAV, M4A · tối đa {formatFileSize(MAX_MEDIA_FILE_SIZE)}</Text></View></View>
          {!file ? <View style={styles.pickerZone}><MaterialCommunityIcons name="file-upload-outline" size={36} color={colors.primary} /><Text style={styles.pickerTitle}>Chọn video hoặc âm thanh</Text><Text style={styles.muted}>Chọn một tệp có sẵn trên điện thoại.</Text><Button onPress={chooseFile}>Chọn tệp phương tiện</Button></View> : <View style={[styles.fileCard, !validation.valid && styles.fileCardInvalid]}><View style={styles.fileHeading}><MaterialCommunityIcons name={validation.valid && validation.mediaType === 'AUDIO' ? 'waveform' : 'video-outline'} size={24} color={colors.primary} /><Text style={styles.fileKind}>{validation.valid ? validation.mediaType === 'VIDEO' ? 'Video' : 'Âm thanh' : 'Tệp không hợp lệ'}</Text></View><Text style={styles.fileName}>{file.name || 'Tệp chưa có tên'}</Text><Text style={styles.muted}>{typeof file.size === 'number' ? formatFileSize(file.size) : 'Không rõ dung lượng'}</Text><View style={styles.actions}><Button size="sm" variant="secondary" disabled={busy || status === 'success'} onPress={chooseFile}>Thay đổi</Button><Button size="sm" variant="ghost" disabled={busy || status === 'success'} onPress={removeFile}>Xóa</Button></View></View>}
          {file && !validation.valid && <Text accessibilityRole="alert" style={styles.error}>{validation.error}</Text>}
          {pickerError && <Text accessibilityRole="alert" style={styles.error}>{pickerError}</Text>}
        </Card>
        <Card style={styles.section}>
          <View style={styles.heading}><Text style={styles.step}>03</Text><View style={styles.headingText}><Text style={styles.sectionTitle}>Tải lên</Text><Text style={styles.muted}>Dự án và tệp phương tiện sẽ được gửi an toàn đến máy chủ.</Text></View></View>
          {status === 'uploading' && <View style={styles.feedback}><ProgressBar value={progress} label="Đang tải phương tiện lên" /><Button variant="secondary" onPress={cancelUpload}>Hủy tải lên</Button></View>}
          {status === 'cancelled' && <View style={styles.feedback}><Text style={styles.sectionTitle}>Đã hủy tải lên</Text><Text style={styles.muted}>Tệp vẫn đang được chọn. Hãy thử lại khi sẵn sàng.</Text><Button onPress={startUpload}>Thử lại</Button><Button variant="secondary" onPress={chooseFile}>Chọn tệp khác</Button></View>}
          {status === 'failed' && <View style={styles.feedback}><Text style={[styles.sectionTitle, styles.error]}>Tải lên thất bại</Text><Text style={styles.muted}>{uploadError ?? 'Không thể tải phương tiện lên.'}</Text><Button onPress={startUpload}>Thử lại</Button><Button variant="secondary" onPress={chooseFile}>Chọn tệp khác</Button></View>}
          {status === 'success' && <View style={styles.feedback}><Text style={[styles.sectionTitle, styles.success]}>Tải lên hoàn tất</Text><Text style={styles.muted}>Dự án và phương tiện đã được lưu.</Text></View>}
          {(status === 'idle' || status === 'selected') && <Button size="lg" disabled={!canUpload} onPress={startUpload}>Tải lên và tiếp tục</Button>}
          {status === 'validating' && <Button size="lg" loading disabled>Đang kiểm tra...</Button>}
        </Card>
      </MobileScreen>
    </SafeAreaView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xl + 24 },
  section: { gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  step: { width: 32, height: 32, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.primaryLight, color: colors.primary, fontWeight: typography.weight.bold },
  headingText: { flex: 1, gap: spacing.xs },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold },
  muted: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 20 },
  fieldLabel: { color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  required: { color: colors.error },
  languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  languageChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, backgroundColor: colors.surface },
  languageChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  languageText: { color: colors.textSecondary, fontSize: typography.size.sm },
  languageTextSelected: { color: colors.primary, fontWeight: typography.weight.semibold },
  pickerZone: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary },
  pickerTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  fileCard: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
  fileCardInvalid: { borderColor: colors.error, backgroundColor: colors.errorLight },
  fileHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fileKind: { color: colors.primary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  fileName: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  feedback: { gap: spacing.md },
  error: { color: colors.error, fontSize: typography.size.sm },
  success: { color: colors.success },
});
