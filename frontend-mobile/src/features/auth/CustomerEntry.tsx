import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStatus } from './AuthBoundary';
import { colors } from '@/theme/tokens';

export function CustomerEntry() {
  const status = useAuthStatus();
  if (status === 'unauthenticated') return <Redirect href="/login" />;
  if (status === 'authenticated') return <Redirect href="/(tabs)/dashboard" />;
  return <View accessibilityLabel="Đang khởi tạo phiên đăng nhập" style={styles.container}><ActivityIndicator color={colors.primary} size="large" /></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background } });
