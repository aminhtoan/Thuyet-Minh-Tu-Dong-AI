import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, customerBrand, spacing, typography } from '@/theme/tokens';

type MobileHeaderProps = { title: string; dashboard?: boolean; back?: boolean };

export function MobileHeader({ title, dashboard = false, back = false }: MobileHeaderProps) {
  return <SafeAreaView edges={['top']} style={styles.safeArea}><View style={[styles.header, dashboard && styles.dashboardHeader]}>
    {back && <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/dashboard'); }} style={({ pressed }) => [styles.avatarControl, pressed && styles.pressed]}><MaterialCommunityIcons accessible={false} name="arrow-left" size={24} color={colors.primary} /></Pressable>}
    <View style={styles.brand}><MaterialCommunityIcons accessible={false} name="bank-outline" size={22} color={colors.primary} /><Text numberOfLines={dashboard ? undefined : 1} style={[styles.title, dashboard && styles.dashboardTitle]}>{title === 'Người kể chuyện AI' ? customerBrand.name : title}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Mở tài khoản" onPress={() => router.navigate('/account')} style={({ pressed }) => [styles.avatarControl, pressed && styles.pressed]}><View style={styles.avatar}><Text style={[styles.avatarText, dashboard && styles.dashboardAvatar]}>U</Text></View></Pressable>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ avatarControl: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: 0.7 }, safeArea: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }, header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md }, brand: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, title: { flex: 1, color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, avatar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 20 }, avatarText: { color: colors.white, fontSize: typography.size.sm, fontWeight: typography.weight.bold }, dashboardHeader: { gap: spacing.sm, paddingVertical: spacing.sm }, dashboardTitle: { fontFamily: typography.family.semibold, fontSize: typography.size.md, lineHeight: 24 }, dashboardAvatar: { fontFamily: typography.family.bold } });
