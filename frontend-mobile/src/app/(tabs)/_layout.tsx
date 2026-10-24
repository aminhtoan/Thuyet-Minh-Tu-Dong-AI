import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { colors, customerBrand, typography } from '@/theme/tokens';
import { navigationLabels } from '@/localization/navigationLabels.mjs';

type TabIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabBarIcon({ name, color, size }: { name: TabIconName; color: ColorValue; size: number }) {
  return <MaterialCommunityIcons name={name} size={size} color={typeof color === 'string' ? color : colors.textMuted} />;
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ header: () => <MobileHeader title="Người kể chuyện AI" />, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted, tabBarHideOnKeyboard: true, tabBarLabelPosition: 'below-icon', tabBarLabelStyle: { fontFamily: typography.family.semibold, fontSize: 11, fontWeight: typography.weight.semibold }, tabBarItemStyle: { flex: 1, minWidth: 0, minHeight: 48 }, tabBarStyle: { paddingTop: 6, backgroundColor: colors.surface, borderTopColor: colors.border } }}>
      <Tabs.Screen name="dashboard" options={{ header: () => <MobileHeader title={customerBrand.name} dashboard />, title: navigationLabels.dashboard, tabBarAccessibilityLabel: navigationLabels.dashboard, tabBarIcon: ({ color, size }) => <TabBarIcon name="view-dashboard-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="projects" options={{ title: navigationLabels.projects, tabBarAccessibilityLabel: navigationLabels.projects, tabBarIcon: ({ color, size }) => <TabBarIcon name="folder-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="history" options={{ title: navigationLabels.history, tabBarAccessibilityLabel: navigationLabels.history, tabBarIcon: ({ color, size }) => <TabBarIcon name="history" color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ title: navigationLabels.account, tabBarAccessibilityLabel: navigationLabels.account, tabBarIcon: ({ color, size }) => <TabBarIcon name="account-circle-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
