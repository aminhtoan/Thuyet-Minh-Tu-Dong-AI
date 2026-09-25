import type { ReactNode } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type EmptyStateProps = { title: string; description: string; action?: ReactNode };

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return <View style={styles.container}><View style={styles.icon}><MaterialCommunityIcons name="inbox-outline" size={24} color={colors.primary} /></View><Text style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text>{action}</View>;
}

const styles = StyleSheet.create({ container: { alignItems: 'center', padding: spacing.lg }, icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.full }, title: { marginBottom: spacing.sm, color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, textAlign: 'center' }, description: { maxWidth: 360, marginBottom: spacing.lg, color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21, textAlign: 'center' } });
