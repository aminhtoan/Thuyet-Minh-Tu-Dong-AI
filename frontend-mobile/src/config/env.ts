import { Platform } from 'react-native';

function resolveApiBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    // In web browser (e.g. ngrok HTTPS or localhost:8081), proxy through Metro
    if (window.location.protocol === 'https:' || window.location.port === '8081') {
      return `${window.location.origin}/api`;
    }
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
}

export const env = Object.freeze({
  apiBaseUrl: resolveApiBaseUrl(),
});
