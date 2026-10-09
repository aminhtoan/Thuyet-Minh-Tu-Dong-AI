import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { Input } from '@/components/common/Input';
import { Spinner } from '@/components/common/Spinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileScreen } from '@/components/layout/MobileScreen';
import { languages } from '@/features/projects/languages';
import { projectRepository } from '@/features/projects/projectRepository';
import { ProjectStatusBadge } from '@/features/projects/ProjectStatusBadge';
import { useProject } from '@/features/projects/useProjects';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export function ProjectDetailScreen({ projectId }: { projectId: string }) {
  const { project, isLoading, error } = useProject(projectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('vi');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Đồng bộ form khi tải xong hoặc chuyển sang một dự án khác trong cùng route.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (project) { setName(project.name); setDescription(project.description ?? ''); setSourceLanguage(project.sourceLanguage); } }, [project]);
  async function save() { if (!project || name.trim().length < 3 || saving) return; setSaving(true); setMessage(null); try { await projectRepository.updateProject(project.id, { name: name.trim(), description: description.trim(), sourceLanguage }); setMessage('Đã lưu thay đổi dự án.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không thể cập nhật dự án.'); } finally { setSaving(false); } }
  function remove() { if (!project || saving) return; Alert.alert('Xóa dự án?', 'Dự án và dữ liệu liên quan sẽ bị xóa vĩnh viễn.', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => void deleteConfirmed() }]); }
  async function deleteConfirmed() { if (!project) return; setSaving(true); try { await projectRepository.deleteProject(project.id); router.replace('/projects'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không thể xóa dự án.'); setSaving(false); } }
  if (isLoading) return <View style={styles.center}><Spinner label="Đang tải dự án" /></View>;
  if (error || !project) return <View style={styles.center}><ErrorState title="Không thể tải dự án" description={error ?? 'Không tìm thấy dự án.'} /></View>;
  return <View style={styles.container}><MobileHeader title="Người kể chuyện AI" /><MobileScreen title="Chi tiết dự án" description="Cập nhật thông tin hoặc tiếp tục quy trình thuyết minh." action={<Button size="sm" variant="ghost" onPress={() => router.back()}>Quay lại</Button>}><Card style={styles.card}>
    <View style={styles.statusRow}><Text style={styles.projectName}>{project.name}</Text><ProjectStatusBadge status={project.status} /></View>
    <Input label="Tên dự án" required value={name} onChangeText={setName} editable={!saving} error={name.trim().length < 3 ? 'Tên dự án phải có ít nhất 3 ký tự.' : undefined} />
    <Input label="Mô tả" value={description} onChangeText={setDescription} editable={!saving} multiline numberOfLines={3} style={styles.multiline} />
    <Text style={styles.label}>Ngôn ngữ nguồn</Text><View style={styles.languages}>{languages.map((language) => <Pressable key={language.code} disabled={saving} onPress={() => setSourceLanguage(language.code)} style={[styles.language, sourceLanguage === language.code && styles.languageSelected]}><Text style={[styles.languageText, sourceLanguage === language.code && styles.languageTextSelected]}>{language.name}</Text></Pressable>)}</View>
    {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
    <View style={styles.actions}><Button loading={saving} disabled={saving || name.trim().length < 3} onPress={save}>Lưu thay đổi</Button><Button variant="secondary" disabled={saving} onPress={() => router.push({ pathname: '/projects/[projectId]/transcript', params: { projectId } })}>Mở quy trình</Button></View>
    <Button variant="ghost" disabled={saving} onPress={remove}>Xóa dự án</Button>
  </Card></MobileScreen></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md, backgroundColor: colors.background }, card: { gap: spacing.md }, statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, projectName: { flex: 1, color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, label: { color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold }, languages: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, language: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full }, languageSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight }, languageText: { color: colors.textSecondary }, languageTextSelected: { color: colors.primary, fontWeight: typography.weight.semibold }, multiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: spacing.sm }, message: { color: colors.textSecondary, fontSize: typography.size.sm }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
