const defaultApiBaseUrl = import.meta.env.MODE === 'staging' ? undefined : 'http://localhost:8080/api'
function normalizeApiBaseUrl(rawUrl?: string): string {
  if (!rawUrl) {
    if (!defaultApiBaseUrl) throw new Error('STAGING_API_URL_REQUIRED')
    return defaultApiBaseUrl
  }
  const trimmed = rawUrl.trim().replace(/\/+$/, '')
  if (!trimmed.endsWith('/api')) {
    return `${trimmed}/api`
  }
  return trimmed
}

export const env = Object.freeze({
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
})
