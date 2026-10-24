import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';
import { libraryNavigationLabel, navigationLabels } from '@/localization/navigationLabels.mjs';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export const customerTabItems: readonly { key: string; route: string | null; label: string; icon: IconName }[] = [
  { key: 'dashboard', route: 'dashboard', label: navigationLabels.dashboard, icon: 'view-dashboard-outline' },
  { key: 'projects', route: 'projects', label: navigationLabels.projects, icon: 'folder-outline' },
  { key: 'create', route: 'create', label: navigationLabels.create, icon: 'microphone-outline' },
  { key: 'library', route: 'library', label: libraryNavigationLabel, icon: 'video-outline' },
];

export function CustomerBottomNavigation({ state, emitter, navigateToTab, insets }: TabBarProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible) return null;
  return <View accessibilityRole="tablist" accessibilityLabel="Điều hướng Customer" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm), paddingLeft: insets.left, paddingRight: insets.right }]}>
    {customerTabItems.map(item => {
      const route = state.routes.find(route => route.name === item.route);
      const selected = Boolean(route && state.routes[state.index]?.key === route.key);
      const disabled = !route;
      function navigate() {
        if (!route) return;
        const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!selected && !event.defaultPrevented) navigateToTab(route.key);
      }
      return <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityHint={disabled ? 'Thư viện sản phẩm hoàn thành chưa được triển khai trên Mobile.' : undefined} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={navigate} onLongPress={() => { if (route) emitter.emit({ type: 'tabLongPress', target: route.key }); }} style={({ pressed }) => [styles.tab, selected && styles.active, pressed && !disabled && styles.pressed]}>
        <MaterialCommunityIcons accessible={false} name={item.icon} size={23} color={selected ? colors.primary : colors.textMuted} />
        <Text style={[styles.label, selected && styles.activeLabel]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  bar: { width: '100%', flexDirection: 'row', alignSelf: 'stretch', paddingTop: spacing.xs, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tab: { flex: 1, minWidth: 0, minHeight: 64, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  label: { fontFamily: typography.family.semibold, fontSize: 11, lineHeight: 15, textAlign: 'center', color: colors.textMuted, alignSelf: 'stretch' },
  active: { backgroundColor: colors.primaryLight }, activeLabel: { color: colors.primary }, pressed: { backgroundColor: colors.surfaceSecondary },
});
