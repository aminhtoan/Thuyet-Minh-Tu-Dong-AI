import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme/tokens';
import { AuthBoundary, useAuthStatus } from '@/features/auth/AuthBoundary';
import { authRouteGuards } from '@/features/auth/authNavigation.mjs';

if (typeof window !== 'undefined') {
  const win = window as unknown as Record<string, unknown>;
  if (!win.zaloJSV2) win.zaloJSV2 = {};
}

function RootNavigator() {
  const status = useAuthStatus();
  const guards = authRouteGuards[status];

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Keep the launch URL valid while session guards change after hydration. */}
      <Stack.Screen name="index" />
      <Stack.Screen name="kham-pha" />
      <Stack.Screen name="kham-pha/[slug]" />
      <Stack.Screen name="thuyet-minh" />
      <Stack.Screen name="thuyet-minh/[slug]" />
      <Stack.Screen name="ve-bao-tang" />
      <Stack.Screen name="khong-gian-cua-toi" />
      <Stack.Protected guard={guards.public} redirectTo="/khong-gian-cua-toi">
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={guards.private} redirectTo="/">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="projects/new" />
        <Stack.Screen name="projects/[projectId]/index" />
        <Stack.Screen name="projects/[projectId]/transcript" />
        <Stack.Screen name="projects/[projectId]/translation" />
        <Stack.Screen name="projects/[projectId]/voice" />
        <Stack.Screen name="projects/[projectId]/generate" />
        <Stack.Screen name="projects/[projectId]/result" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'BeVietnamPro-Regular': require('../../assets/fonts/be-vietnam-pro/regular.ttf'),
    'BeVietnamPro-Semibold': require('../../assets/fonts/be-vietnam-pro/semibold.ttf'),
    'BeVietnamPro-Bold': require('../../assets/fonts/be-vietnam-pro/bold.ttf'),
  });
  // Font failure must not trap the user or change authentication/navigation rules.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator accessibilityLabel="Đang tải giao diện" color={colors.primary} /></View>;
  return <SafeAreaProvider><AuthBoundary><RootNavigator /><StatusBar style="dark" /></AuthBoundary></SafeAreaProvider>;
}
