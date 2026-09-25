import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

type MobileScreenProps = ScrollViewProps & { title: string; description?: string; action?: ReactNode; children: ReactNode };

export function MobileScreen({ title, description, action, children, contentContainerStyle, ...props }: MobileScreenProps) {
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, contentContainerStyle]} keyboardShouldPersistTaps="handled" {...props}><View style={styles.pageHeader}><View style={styles.heading}><Text style={styles.title}>{title}</Text>{description && <Text style={styles.description}>{description}</Text>}</View>{action}</View>{children}</ScrollView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }, pageHeader: { marginBottom: spacing.sm, gap: spacing.md }, heading: { gap: spacing.xs }, title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold }, description: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21 } });
