import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

type MobileScreenProps = ScrollViewProps & { title: string; description?: string; action?: ReactNode; children: ReactNode; dashboard?: boolean; headerContent?: ReactNode };

export function MobileScreen({ title, description, action, children, contentContainerStyle, dashboard = false, headerContent, ...props }: MobileScreenProps) {
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, contentContainerStyle]} keyboardShouldPersistTaps="handled" {...props}>{headerContent ?? <View style={styles.pageHeader}><View style={styles.heading}><Text accessibilityRole="header" style={[styles.title, dashboard && styles.dashboardTitle]}>{title}</Text>{description && <Text style={[styles.description, dashboard && styles.dashboardDescription]}>{description}</Text>}</View>{action ? <View style={[styles.headerAction, dashboard && styles.dashboardAction]}>{action}</View> : null}</View>}{children}</ScrollView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }, pageHeader: { marginBottom: spacing.sm, gap: spacing.sm }, heading: { gap: spacing.xs }, headerAction: { alignSelf: 'flex-start' }, title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold }, description: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21 }, dashboardTitle: { fontFamily: typography.family.bold, lineHeight: 34 }, dashboardDescription: { fontFamily: typography.family.regular, lineHeight: 22 }, dashboardAction: { alignSelf: 'stretch', marginTop: spacing.sm } });
