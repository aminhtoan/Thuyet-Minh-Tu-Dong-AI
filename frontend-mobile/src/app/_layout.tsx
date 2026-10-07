import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthBoundary } from '@/features/auth/AuthBoundary';

export default function RootLayout() {
  return <SafeAreaProvider><AuthBoundary><Stack screenOptions={{ headerShown: false }} /><StatusBar style="dark" /></AuthBoundary></SafeAreaProvider>;
}
