function normalizeApiBaseUrl(rawUrl?: string): string {
  if (!rawUrl) return 'http://localhost:8080/api'
  const trimmed = rawUrl.trim().replace(/\/+$/, '')
  if (!trimmed.endsWith('/api')) {
    return `${trimmed}/api`
  }
  return trimmed
}

export const env = Object.freeze({
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
})
