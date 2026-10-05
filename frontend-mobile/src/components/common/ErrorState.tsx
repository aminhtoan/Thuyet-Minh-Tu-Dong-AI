import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { Button } from './Button';

type ErrorStateProps = { title: string; description: string; onRetry?: () => void; retryLabel?: string };

export function ErrorState({ title, description, onRetry, retryLabel = 'Thử lại' }: ErrorStateProps) {
  return <View accessibilityRole="alert" style={styles.container}><View style={styles.icon}><MaterialCommunityIcons name="alert-circle-outline" size={24} color={colors.error} /></View><Text style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text>{onRetry && <Button variant="secondary" size="sm" onPress={onRetry}>{retryLabel}</Button>}</View>;
}

const styles = StyleSheet.create({ container: { alignItems: 'center', padding: spacing.lg }, icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, backgroundColor: colors.errorLight, borderRadius: radius.full }, title: { marginBottom: spacing.sm, color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, textAlign: 'center' }, description: { maxWidth: 360, marginBottom: spacing.lg, color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21, textAlign: 'center' } });
