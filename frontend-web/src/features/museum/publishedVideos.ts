import { env } from '../../config/env'

export type PublishedNarrationVideo = {
  id: string; projectId: string; title: string; artifactType: 'VIDEO'; sourceMediaType: 'VIDEO';
  languageCode: string; mimeType: 'video/mp4'; duration: number; fileUrl: string
}
const objectId = /^[a-f\d]{24}$/i
export function publicVideoUrl(video: PublishedNarrationVideo): string | undefined {
  try {
    const base = new URL(env.apiBaseUrl, window.location.origin)
    const url = new URL(video.fileUrl, base.origin)
    const match = /^\/api\/published-video-narrations\/public\/projects\/([a-f\d]{24})\/results\/([a-f\d]{24})\/file$/i.exec(url.pathname)
    if (!/^https?:$/.test(url.protocol) || url.origin !== base.origin || url.username || url.password || url.search || url.hash
      || !match || match[1] !== video.projectId || match[2] !== video.id) return undefined
    return url.href
  } catch { return undefined }
}
export function parsePublishedVideos(value: unknown): PublishedNarrationVideo[] {
  if (!value || typeof value !== 'object' || !('success' in value) || value.success !== true
    || !('data' in value) || !value.data || typeof value.data !== 'object'
    || !('videos' in value.data) || !Array.isArray(value.data.videos)) throw Error('Invalid public video response')
  const videos = value.data.videos.filter((item): item is PublishedNarrationVideo => {
    if (!item || typeof item !== 'object') return false
    const video = item as PublishedNarrationVideo
    return typeof video.id === 'string' && objectId.test(video.id) && typeof video.projectId === 'string' && objectId.test(video.projectId)
      && video.artifactType === 'VIDEO' && video.sourceMediaType === 'VIDEO' && video.mimeType === 'video/mp4'
      && typeof video.title === 'string' && Boolean(video.title.trim()) && typeof video.languageCode === 'string'
      && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(video.languageCode) && Number.isFinite(video.duration) && video.duration > 0
      && typeof video.fileUrl === 'string' && Boolean(publicVideoUrl(video))
  })
  // A Result, not a project or language, is the identity. Reject ambiguous duplicate entries.
  return videos.filter(video => videos.filter(other => other.id === video.id).length === 1)
}
export async function listPublishedVideos(signal?: AbortSignal) {
  const response = await fetch(`${env.apiBaseUrl}/published-video-narrations/public`, { signal, cache: 'no-store', credentials: 'omit' })
  if (!response.ok) throw Error('Public video listing unavailable')
  return parsePublishedVideos(await response.json())
}
export async function checkPublishedVideo(video: PublishedNarrationVideo, signal: AbortSignal) {
  const url = publicVideoUrl(video)
  if (!url) throw Error('Invalid public video URL')
  const response = await fetch(url, { method: 'HEAD', signal, cache: 'no-store', credentials: 'omit', redirect: 'error' })
  if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'video/mp4') throw Error('Public video revoked or unavailable')
  return url
}
export function publishedVideoLanguage(code: string) {
  const names: Record<string, string> = { vi: 'Tiếng Việt', en: 'Tiếng Anh', th: 'Tiếng Thái', ko: 'Tiếng Hàn', 'zh-cn': 'Tiếng Trung giản thể', ja: 'Tiếng Nhật' }
  return names[code.toLowerCase()] ?? code
}
