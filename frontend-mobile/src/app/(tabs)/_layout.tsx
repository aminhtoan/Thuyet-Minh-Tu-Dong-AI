import { Tabs } from 'expo-router';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { CustomerBottomNavigation } from '@/components/layout/CustomerBottomNavigation';
import { colors, customerBrand, typography } from '@/theme/tokens';
import { libraryNavigationLabel, navigationLabels } from '@/localization/navigationLabels.mjs';

export default function TabLayout() {
  return (
    <Tabs backBehavior="history" tabBar={props => <CustomerBottomNavigation {...props} />} screenOptions={{ header: () => <MobileHeader title={customerBrand.name} />, freezeOnBlur: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted, tabBarHideOnKeyboard: true, tabBarLabelStyle: { fontFamily: typography.family.semibold }, tabBarItemStyle: { flex: 1, minWidth: 0, minHeight: 48 }, tabBarStyle: { backgroundColor: colors.surface } }}>
      <Tabs.Screen name="dashboard" options={{ header: () => <MobileHeader title={customerBrand.name} dashboard />, title: navigationLabels.dashboard }} />
      <Tabs.Screen name="projects" options={{ title: navigationLabels.projects }} />
      <Tabs.Screen name="create" options={{ title: navigationLabels.create }} />
      <Tabs.Screen name="library" options={{ title: libraryNavigationLabel }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null, header: () => <MobileHeader title={navigationLabels.account} back /> }} />
    </Tabs>
  );
}
