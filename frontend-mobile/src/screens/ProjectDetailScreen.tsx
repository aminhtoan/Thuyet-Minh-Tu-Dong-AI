import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { Input } from '@/components/common/Input';
import { Spinner } from '@/components/common/Spinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileScreen } from '@/components/layout/MobileScreen';
import { WorkflowSteps } from '@/components/common/WorkflowSteps';
import { formatFileSize } from '@/features/projects/mediaUpload';
import { projectAction } from '@/features/projects/projectAction';
import { languages } from '@/features/projects/languages';
import { runProjectSaveOnce, validateProjectEdit } from '@/features/projects/projectEditing.mjs';
import { projectRepository } from '@/features/projects/projectRepository';
import { ProjectStatusBadge } from '@/features/projects/ProjectStatusBadge';
import { useProject } from '@/features/projects/useProjects';
import type { ProjectStatus } from '@/features/projects/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';

function workflowStep(status: ProjectStatus): 'transcript' | 'translation' | 'voice' | 'generate' | 'result' {
  if (status === 'COMPLETED') return 'result';
  if (status === 'TRANSLATED') return 'voice';
  if (status === 'TRANSCRIBED' || status === 'TRANSLATING') return 'translation';
  if (status === 'GENERATING_AUDIO' || status === 'PROCESSING_VIDEO' || status === 'FAILED') return 'generate';
  return 'transcript';
}

export function ProjectDetailScreen({ projectId }: { projectId: string }) {
  const { project, isLoading, error } = useProject(projectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('vi');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const saveLock = useRef({ current: false });
  const validation = validateProjectEdit({ name, description, sourceLanguage }, languages.map((language) => language.code));
  // Đồng bộ form khi tải xong hoặc chuyển sang một dự án khác trong cùng route.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (project) { setName(project.name); setDescription(project.description ?? ''); setSourceLanguage(project.sourceLanguage); } }, [project]);
  async function save() { if (!project || !validation.valid) { if (!validation.valid) setMessage({ kind: 'error', text: validation.error }); return; } await runProjectSaveOnce(saveLock.current, async () => { setSaving(true); setMessage(null); try { await projectRepository.updateProject(project.id, validation.value); setMessage({ kind: 'success', text: 'Đã lưu thay đổi dự án.' }); } catch (reason) { setMessage({ kind: 'error', text: reason instanceof Error ? reason.message : 'Không thể cập nhật dự án.' }); } finally { setSaving(false); } }); }
  function remove() { if (!project || saving) return; Alert.alert('Xóa dự án?', 'Dự án và dữ liệu liên quan sẽ bị xóa vĩnh viễn.', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => void deleteConfirmed() }]); }
  async function deleteConfirmed() { if (!project) return; setSaving(true); try { await projectRepository.deleteProject(project.id); router.replace('/projects'); } catch (reason) { setMessage({ kind: 'error', text: reason instanceof Error ? reason.message : 'Không thể xóa dự án.' }); setSaving(false); } }
  if (isLoading) return <View style={styles.center}><Spinner label="Đang tải dự án" /></View>;
  if (error || !project) return <View style={styles.center}><ErrorState title="Không thể tải dự án" description={error ?? 'Không tìm thấy dự án.'} /></View>;
  const action = projectAction(project);
  function openWorkflow() {
    if (action.step === 'result') router.push({ pathname: '/projects/[projectId]/result', params: { projectId } });
    else if (action.step === 'generate') router.push({ pathname: '/projects/[projectId]/generate', params: { projectId } });
    else router.push({ pathname: '/projects/[projectId]/transcript', params: { projectId } });
  }
  return <View style={styles.container}><MobileHeader title="Người kể chuyện AI" /><MobileScreen title="Chi tiết dự án" description="Cập nhật thông tin hoặc tiếp tục quy trình thuyết minh." action={<Button size="sm" variant="ghost" onPress={() => router.back()}>Quay lại danh sách</Button>}><Card style={styles.card}>
    <View style={styles.statusRow}><Text style={styles.projectName}>{project.name}</Text><ProjectStatusBadge status={project.status} /></View>
    <Text style={styles.projectDescription}>{project.description || 'Chưa có mô tả.'}</Text>
    <WorkflowSteps current={workflowStep(project.status)} />
  </Card><Card style={styles.card}>
    <Text style={styles.sectionTitle}>Phương tiện nguồn</Text>
    <View style={styles.mediaRow}><Text style={styles.mediaLabel}>Tên tệp</Text><Text style={styles.mediaValue}>{project.mediaName ?? 'Chưa tải lên'}</Text></View>
    <View style={styles.mediaRow}><Text style={styles.mediaLabel}>Loại</Text><Text style={styles.mediaValue}>{project.mediaType === 'VIDEO' ? 'Video' : project.mediaType === 'AUDIO' ? 'Âm thanh' : 'Chưa xác định'}</Text></View>
    <View style={styles.mediaRow}><Text style={styles.mediaLabel}>Dung lượng</Text><Text style={styles.mediaValue}>{project.mediaSize ? formatFileSize(project.mediaSize) : 'Chưa có dữ liệu'}</Text></View>
  </Card><Card style={styles.card}>
    <Text style={styles.sectionTitle}>Chỉnh sửa thông tin</Text>
    <Input label="Tên dự án" required value={name} onChangeText={setName} editable={!saving} maxLength={150} error={!name.trim() ? 'Tên dự án là bắt buộc.' : undefined} />
    <Input label="Mô tả" value={description} onChangeText={setDescription} editable={!saving} maxLength={1000} multiline numberOfLines={3} style={styles.multiline} />
    <Text style={styles.label}>Ngôn ngữ nguồn</Text><View style={styles.languages}>{languages.map((language) => <Pressable key={language.code} disabled={saving} onPress={() => setSourceLanguage(language.code)} style={[styles.language, sourceLanguage === language.code && styles.languageSelected]}><Text style={[styles.languageText, sourceLanguage === language.code && styles.languageTextSelected]}>{language.name}</Text></Pressable>)}</View>
    {message && <Text accessibilityLiveRegion="polite" accessibilityRole={message.kind === 'error' ? 'alert' : 'text'} style={[styles.message, message.kind === 'success' ? styles.success : styles.error]}>{message.text}</Text>}
    <View style={styles.actions}><Button loading={saving} disabled={saving || !validation.valid} onPress={save}>Lưu thay đổi</Button><Button variant="secondary" disabled={saving} onPress={openWorkflow}>{action.label}</Button></View>
    <Button variant="ghost" disabled={saving} onPress={remove}>Xóa dự án</Button>
  </Card></MobileScreen></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md, backgroundColor: colors.background }, card: { gap: spacing.md }, statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, projectName: { minWidth: 180, flex: 1, color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, projectDescription: { color: colors.textSecondary, lineHeight: 21 }, sectionTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, mediaRow: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }, mediaLabel: { color: colors.textSecondary, fontSize: typography.size.sm }, mediaValue: { minWidth: 0, flex: 1, color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textAlign: 'right' }, label: { color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold }, languages: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, language: { minHeight: 44, minWidth: 104, flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full }, languageSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight }, languageText: { color: colors.textSecondary, textAlign: 'center' }, languageTextSelected: { color: colors.primary, fontWeight: typography.weight.semibold }, multiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: spacing.sm }, message: { fontSize: typography.size.sm }, success: { color: colors.success }, error: { color: colors.error }, actions: { gap: spacing.sm } });
