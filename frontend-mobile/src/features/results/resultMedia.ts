import type { Result } from './types';

// Only the existing protected relative artifact contract receives credentials.
export function protectedResultUrl(apiBaseUrl: string, result: Result) {
  const expected = `/api/projects/${encodeURIComponent(result.projectId)}/${result.artifactType === 'VIDEO' ? 'results' : 'narrations'}/${encodeURIComponent(result.id)}/${result.artifactType === 'VIDEO' ? 'file' : 'audio'}`;
  if (result.filePath !== expected) throw new Error('RESULT_MEDIA_PATH_INVALID');
  return `${apiBaseUrl.replace(/\/$/, '')}${expected.replace(/^\/api/, '')}`;
}
