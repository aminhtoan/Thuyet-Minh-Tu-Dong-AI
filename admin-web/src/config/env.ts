function normalizeApiBaseUrl(rawUrl?: string): string {
  if (!rawUrl) return 'http://localhost:8080/api';
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed.endsWith('/api')) {
    return `${trimmed}/api`;
  }
  return trimmed;
}

export const environment = {
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  publicMuseumUrl: import.meta.env.VITE_PUBLIC_MUSEUM_URL ?? 'http://localhost:5173/',
};
