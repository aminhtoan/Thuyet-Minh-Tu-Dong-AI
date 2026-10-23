import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme/tokens';
import { AuthBoundary, useAuthStatus } from '@/features/auth/AuthBoundary';
import { authRouteGuards } from '@/features/auth/authNavigation.mjs';

function RootNavigator() {
  const status = useAuthStatus();
  const guards = authRouteGuards[status];

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={guards.loading}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={guards.public}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={guards.private}>
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
