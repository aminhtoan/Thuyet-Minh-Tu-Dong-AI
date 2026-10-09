import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
  return <SafeAreaProvider><AuthBoundary><RootNavigator /><StatusBar style="dark" /></AuthBoundary></SafeAreaProvider>;
}
