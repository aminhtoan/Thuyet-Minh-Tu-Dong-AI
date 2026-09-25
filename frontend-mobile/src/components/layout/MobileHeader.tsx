import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/theme/tokens';

type MobileHeaderProps = { title: string };

export function MobileHeader({ title }: MobileHeaderProps) {
  return <SafeAreaView edges={['top']} style={styles.safeArea}><View style={styles.header}><View style={styles.brand}><MaterialCommunityIcons name="creation" size={22} color={colors.primary} /><Text numberOfLines={1} style={styles.title}>{title}</Text></View><View accessibilityLabel="User placeholder" style={styles.avatar}><Text style={styles.avatarText}>U</Text></View></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }, header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md }, brand: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, title: { flex: 1, color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, avatar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 20 }, avatarText: { color: colors.white, fontSize: typography.size.sm, fontWeight: typography.weight.bold } });
