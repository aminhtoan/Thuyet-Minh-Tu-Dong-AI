import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export function AuthFooter({ prompt, label, href }: { prompt: string; label: string; href: '/login' | '/register' }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.footer}>
      <Text style={styles.prompt}>{prompt}</Text>
      <Link href={href} asChild>
        <Pressable accessibilityRole="link" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [styles.link, pressed && styles.pressed, focused && styles.focused]}>
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: spacing.xs },
  prompt: { flexShrink: 1, fontFamily: typography.family.regular, fontSize: typography.size.md, color: colors.textSecondary, lineHeight: typography.lineHeight.normal, textAlign: 'center' },
  link: { minWidth: 48, minHeight: 48, flexShrink: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 2, borderColor: 'transparent' },
  pressed: { backgroundColor: colors.primaryLight }, focused: { borderColor: colors.primary },
  label: { fontFamily: typography.family.semibold, fontSize: typography.size.md, color: colors.primary, lineHeight: typography.lineHeight.normal, textAlign: 'center' },
});
