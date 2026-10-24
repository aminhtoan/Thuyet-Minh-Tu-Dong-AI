import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Input } from '@/components/common/Input';
import { Spinner } from '@/components/common/Spinner';
import { filterLibrary, libraryLanguageNames, libraryProduct, type LibraryProduct } from '@/features/results/libraryPresentation';
import { useLibrary } from '@/features/results/useLibrary';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const defaults = { query: '', media: 'ALL', language: 'ALL' };
export function LibraryScreen() {
  const { projects, isLoading, error, reload } = useLibrary();
  const [draft, setDraft] = useState(defaults), [applied, setApplied] = useState(defaults), [page, setPage] = useState(1);
  const products = useMemo(() => projects.flatMap(project => { const item = libraryProduct(project); return item ? [item] : []; }), [projects]);
  const languages = [...new Set(products.map(item => item.language))].sort();
  const matches = filterLibrary(products, applied);
  const totalPages = Math.max(1, Math.ceil(matches.length / 12)), currentPage = Math.min(page, totalPages);
  const visible = !isLoading && !error ? matches.slice((currentPage - 1) * 12, currentPage * 12) : [];
  const unverified = projects.some(project => project.status === 'COMPLETED' && !libraryProduct(project));
  const apply = () => { setApplied({ ...draft }); setPage(1); };
  const header = <View style={styles.header}>
    <Text accessibilityRole="header" style={styles.title}>Thư viện thuyết minh</Text>
    <Text style={styles.description}>Xem lại các sản phẩm thuyết minh đã hoàn thành của bạn.</Text>
    <Card><View style={styles.toolbar}>
      <Input label="Tìm kiếm sản phẩm" placeholder="Nhập tên dự án..." value={draft.query} onChangeText={query => setDraft({ ...draft, query })} returnKeyType="search" onSubmitEditing={apply} />
      <LibraryChoices label="Loại phương tiện" value={draft.media} options={[['ALL', 'Tất cả phương tiện'], ['VIDEO', 'Video'], ['AUDIO', 'Âm thanh']]} onChange={media => setDraft({ ...draft, media })} />
      {languages.length > 0 && <LibraryChoices label="Ngôn ngữ thuyết minh" value={draft.language} options={[[ 'ALL', 'Tất cả ngôn ngữ' ], ...languages.map(code => [code, libraryLanguageNames[code] ?? code] as [string, string])]} onChange={language => setDraft({ ...draft, language })} />}
      <Button disabled={isLoading} onPress={apply}>Tìm kiếm</Button>
    </View></Card>
    {isLoading ? <Card><Spinner label="Đang tải thư viện thuyết minh" /><Text accessibilityLiveRegion="polite" style={styles.description}>Đang tải thư viện thuyết minh...</Text></Card>
      : error ? <Card><ErrorState title="Không thể tải thư viện thuyết minh" description={error} onRetry={reload} /></Card>
      : unverified ? <Text accessibilityLiveRegion="polite" style={styles.description}>Dữ liệu chưa đầy đủ. Một số dự án chưa có đủ xác nhận tệp kết quả và ngôn ngữ từ máy chủ nên chưa được hiển thị trong thư viện.</Text> : null}
  </View>;
  return <FlatList style={styles.screen} contentContainerStyle={styles.content} data={visible} keyExtractor={item => item.project.id} renderItem={({ item }) => <LibraryProductCard item={item} />} ListHeaderComponent={header}
    ItemSeparatorComponent={() => <View style={styles.separator} />} keyboardShouldPersistTaps="handled"
    ListEmptyComponent={!isLoading && !error ? <Card><EmptyState title={products.length ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm thuyết minh.'} description={products.length ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc.' : 'Tạo thuyết minh để bắt đầu một dự án mới.'} action={!products.length ? <Button onPress={() => router.push('/projects/new')}>Tạo thuyết minh</Button> : undefined} /></Card> : undefined}
    ListFooterComponent={!isLoading && !error && matches.length > 12 ? <View accessibilityLabel="Phân trang thư viện" style={styles.pagination}><Button variant="secondary" disabled={currentPage <= 1} onPress={() => setPage(currentPage - 1)}>Trang trước</Button><Text accessibilityLiveRegion="polite" style={styles.description}>Trang {currentPage} / {totalPages}</Text><Button variant="secondary" disabled={currentPage >= totalPages} onPress={() => setPage(currentPage + 1)}>Trang sau</Button></View> : undefined} />;
}
export function LibraryProductCard({ item }: { item: LibraryProduct }) {
  return <Card><View style={styles.product}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.visual}><MaterialCommunityIcons name={item.mediaType === 'VIDEO' ? 'video-outline' : 'waveform'} size={48} color={colors.primary} /></View>
    <Text accessibilityRole="header" style={styles.productTitle}>{item.project.name}</Text>
    <Text style={styles.description}>Phương tiện: {item.mediaType === 'VIDEO' ? 'Video' : 'Âm thanh'}</Text>
    <Text style={styles.description}>Ngôn ngữ thuyết minh: {libraryLanguageNames[item.language] ?? item.language}</Text>
    <Button wrapLabel accessibilityLabel={`Xem thuyết minh ${item.project.name}`} onPress={() => router.push({ pathname: '/projects/[projectId]/result', params: { projectId: item.project.id, language: item.language } })}>Xem thuyết minh</Button>
  </View></Card>;
}
function LibraryChoices({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <View style={styles.toolbar}><Text style={styles.label}>{label}</Text><View style={styles.choices}>{options.map(([code, name]) => <Pressable accessibilityRole="radio" accessibilityLabel={`${label}: ${name}`} accessibilityState={{ selected: code === value }} key={code} onPress={() => onChange(code)} style={({ pressed }) => [styles.choice, code === value && styles.selected, pressed && styles.pressed]}><Text style={[styles.choiceLabel, code === value && styles.selectedLabel]}>{name}</Text></Pressable>)}</View></View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.md }, toolbar: { gap: spacing.sm },
  title: { color: colors.textPrimary, fontFamily: typography.family.bold, fontSize: typography.size.xl },
  description: { color: colors.textSecondary, fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, flexShrink: 1 },
  label: { color: colors.textPrimary, fontFamily: typography.family.semibold, fontSize: typography.size.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { minHeight: 48, minWidth: 48, maxWidth: '100%', flexShrink: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  choiceLabel: { color: colors.textSecondary, fontFamily: typography.family.regular, fontSize: typography.size.sm, flexShrink: 1 }, selected: { borderColor: colors.primary, backgroundColor: colors.primaryLight }, selectedLabel: { color: colors.primary }, pressed: { opacity: 0.75 },
  product: { gap: spacing.sm, minWidth: 0 }, productTitle: { fontFamily: typography.family.semibold, color: colors.textPrimary, fontSize: typography.size.lg, lineHeight: 26 },
  visual: { aspectRatio: 16 / 9, backgroundColor: colors.primaryLight, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  separator: { height: spacing.md }, pagination: { marginTop: spacing.lg, gap: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
});
