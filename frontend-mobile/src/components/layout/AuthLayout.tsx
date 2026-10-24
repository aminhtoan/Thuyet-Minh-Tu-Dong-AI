import type { ReactNode } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, customerBrand, radius, shadows, spacing, typography } from '@/theme/tokens';

type AuthLayoutProps = { title: string; description: string; children: ReactNode; footer: ReactNode };

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator>
          <View style={styles.container}>
            <View style={styles.brand}>
              <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.mark}><MaterialCommunityIcons name="bank-outline" size={24} color={colors.primary} /></View>
              <View style={styles.brandCopy}><Text style={styles.brandName}>{customerBrand.name}</Text><Text style={styles.tagline}>{customerBrand.tagline}</Text></View>
            </View>
            <View style={[styles.card, width >= 400 && styles.cardRoomy]}>
              <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text></View>
              {children}
              <View style={styles.footer}>{footer}</View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 }, scroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.md, paddingVertical: spacing.lg },
  container: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  mark: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, borderRadius: radius.lg },
  brandCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  brandName: { fontFamily: typography.family.bold, color: colors.navy, fontSize: typography.size.lg, lineHeight: typography.lineHeight.normal },
  tagline: { fontFamily: typography.family.semibold, color: colors.primary, fontSize: typography.size.xs, lineHeight: typography.lineHeight.tight },
  card: { padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, ...shadows.sm },
  cardRoomy: { padding: spacing.lg },
  heading: { marginBottom: spacing.lg, gap: spacing.sm },
  title: { fontFamily: typography.family.bold, color: colors.navy, fontSize: typography.size.xl, lineHeight: typography.size.xxl },
  description: { fontFamily: typography.family.regular, color: colors.textSecondary, fontSize: typography.size.md, lineHeight: typography.lineHeight.normal },
  footer: { marginTop: spacing.md },
});
