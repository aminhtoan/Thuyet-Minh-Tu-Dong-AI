import type { ReactNode } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type AuthLayoutProps = { title: string; description: string; children: ReactNode; footer: ReactNode };

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brand}><View style={styles.mark}><MaterialCommunityIcons name="creation" size={28} color={colors.white} /></View><Text style={styles.brandName}>Người kể chuyện AI</Text></View>
          <View style={styles.card}>
            <View style={styles.heading}><Text style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text></View>
            {children}
            <View style={styles.footer}>{footer}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: colors.background }, keyboardView: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', padding: spacing.md, paddingVertical: spacing.xl }, brand: { alignItems: 'center', marginBottom: spacing.lg }, mark: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg }, brandName: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold }, card: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, ...shadows.md }, heading: { marginBottom: spacing.xl, gap: spacing.sm }, title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, textAlign: 'center' }, description: { color: colors.textSecondary, fontSize: typography.size.md, lineHeight: 24, textAlign: 'center' }, footer: { alignItems: 'center', marginTop: spacing.xl } });
