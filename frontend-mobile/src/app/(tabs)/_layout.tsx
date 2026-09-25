import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { colors, typography } from '@/theme/tokens';

type TabIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabBarIcon({ name, color, size }: { name: TabIconName; color: ColorValue; size: number }) {
  return <MaterialCommunityIcons name={name} size={size} color={typeof color === 'string' ? color : colors.textMuted} />;
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ header: () => <MobileHeader title="AI Narrator" />, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted, tabBarHideOnKeyboard: true, tabBarLabelStyle: { fontSize: 12, fontWeight: typography.weight.semibold }, tabBarItemStyle: { minHeight: 48 }, tabBarStyle: { paddingTop: 6, backgroundColor: colors.surface, borderTopColor: colors.border } }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarAccessibilityLabel: 'Dashboard', tabBarIcon: ({ color, size }) => <TabBarIcon name="view-dashboard-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="projects" options={{ title: 'Projects', tabBarIcon: ({ color, size }) => <TabBarIcon name="folder-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color, size }) => <TabBarIcon name="history" color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <TabBarIcon name="cog-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
