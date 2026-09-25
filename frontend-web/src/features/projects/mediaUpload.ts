import type { MediaType } from './types'

export const MAX_MEDIA_FILE_SIZE = 500 * 1024 * 1024
export type UploadStatus = 'idle' | 'selected' | 'validating' | 'uploading' | 'success' | 'failed' | 'cancelled'
export type MediaFile = { name?: string; size?: number; mimeType?: string | null }

const videoExtensions = new Set(['mp4', 'mov', 'webm'])
const audioExtensions = new Set(['mp3', 'wav', 'm4a'])
const knownMimeTypes: Record<string, MediaType> = {
  'video/mp4': 'VIDEO', 'video/quicktime': 'VIDEO', 'video/webm': 'VIDEO',
  'audio/mpeg': 'AUDIO', 'audio/mp3': 'AUDIO', 'audio/wav': 'AUDIO', 'audio/x-wav': 'AUDIO',
  'audio/mp4': 'AUDIO', 'audio/x-m4a': 'AUDIO', 'audio/m4a': 'AUDIO', 'audio/webm': 'AUDIO',
}

export function getMediaType(file: MediaFile): MediaType | null {
  const extension = file.name?.split('.').pop()?.toLowerCase()
  const byExtension = extension && (videoExtensions.has(extension) ? 'VIDEO' : audioExtensions.has(extension) ? 'AUDIO' : null)
  if (!byExtension) return null
  const mime = file.mimeType?.toLowerCase().split(';')[0].trim()
  if (!mime || mime === 'application/octet-stream') return byExtension
  const byMime = knownMimeTypes[mime]
  return byMime && byMime === byExtension ? byExtension : null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const unit = bytes < 1024 ** 2 ? 'KB' : bytes < 1024 ** 3 ? 'MB' : 'GB'
  const divisor = unit === 'KB' ? 1024 : unit === 'MB' ? 1024 ** 2 : 1024 ** 3
  return `${Number((bytes / divisor).toFixed(1))} ${unit}`
}

export function validateMediaFile(file: MediaFile | null): { valid: true; mediaType: MediaType } | { valid: false; error: string } {
  if (!file) return { valid: false, error: 'Choose a video or audio file.' }
  if (!file.name?.trim()) return { valid: false, error: 'File name is unavailable.' }
  const mediaType = getMediaType(file)
  if (!mediaType) return { valid: false, error: 'Unsupported file format. Use MP4, MOV, WEBM, MP3, WAV or M4A.' }
  if (typeof file.size !== 'number' || !Number.isFinite(file.size) || file.size <= 0) return { valid: false, error: 'File size is unavailable or empty.' }
  if (file.size > MAX_MEDIA_FILE_SIZE) return { valid: false, error: 'File exceeds the 500 MB limit.' }
  return { valid: true, mediaType }
}

export function validateProjectName(name: string): string | null {
  return name.trim().length >= 3 ? null : 'Project name must be at least 3 characters.'
}
