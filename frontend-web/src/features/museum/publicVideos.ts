import { publicMuseumAssetPaths } from './publicMediaAssets'

export const museumVideoLanguages = [
  { code: 'vi', name: 'Tiếng Việt', internationalName: 'Vietnamese' },
  { code: 'en', name: 'Tiếng Anh', internationalName: 'English' },
  { code: 'th', name: 'Tiếng Thái', internationalName: 'Thai' },
  { code: 'ko', name: 'Tiếng Hàn', internationalName: 'Korean' },
  { code: 'zh-CN', name: 'Tiếng Trung giản thể', internationalName: 'Simplified Chinese' },
] as const
export type MuseumVideoLanguage = typeof museumVideoLanguages[number]['code']
export type MuseumVideoVariant = {
  language: MuseumVideoLanguage
  state: 'AVAILABLE' | 'PROCESSING' | 'UNAVAILABLE'
  videoUrl?: string
  captionUrl?: string
  captionLanguage?: MuseumVideoLanguage
  transcript?: { language: MuseumVideoLanguage; text: string }
  chapters?: readonly { startTime: number; title: string }[]
}
export type MuseumPublicVideo = {
  slug: string
  title: string
  description: string
  posterUrl?: string
  sourceAttribution: { label: string; reference: string }
  rights: { confirmed: boolean; license: string; credit: string; verificationReference: string }
  visibility: 'PUBLIC' | 'PRIVATE'
  publishedStatus: 'DRAFT' | 'PUBLISHED'
  sourceLanguage: 'vi'
  languageVariants: readonly MuseumVideoVariant[]
}

// Published using the user's confirmation of specific channel-owner permission.
// No author identity, ownership, or Creative Commons license is inferred.
export const museumPublicVideos: readonly MuseumPublicVideo[] = [{
  slug: 'bao-tang-chung-tich-chien-tranh',
  title: 'Bảo tàng Chứng tích Chiến tranh — Video giới thiệu',
  description: 'Khám phá những câu chuyện lịch sử qua video giới thiệu Bảo tàng Chứng tích Chiến tranh.',
  posterUrl: '/museum/posters/bao-tang-chung-tich-chien-tranh.jpg',
  sourceAttribution: { label: 'YouTube', reference: 'https://youtu.be/_MN6nsn-XDM' },
  rights: {
    confirmed: true,
    license: 'Được chủ kênh cho phép tải và đăng lại trên website, theo xác nhận của người dùng. Quyền cho phép cụ thể cho website, không phải giấy phép Creative Commons.',
    credit: 'Nguồn video: YouTube — xem video gốc',
    verificationReference: 'Người dùng xác nhận chủ kênh YouTube cho phép tải và đăng lại trên website — MUSEUM-06.2.2.',
  },
  visibility: 'PUBLIC',
  publishedStatus: 'PUBLISHED',
  sourceLanguage: 'vi',
  languageVariants: [
    { language: 'vi', state: 'AVAILABLE', videoUrl: '/museum/videos/bao-tang-chung-tich-chien-tranh.mp4' },
    { language: 'en', state: 'UNAVAILABLE' },
    { language: 'th', state: 'UNAVAILABLE' },
    { language: 'ko', state: 'UNAVAILABLE' },
    { language: 'zh-CN', state: 'UNAVAILABLE' },
  ],
}]

export function getPublicVideoSourceUrl(video: MuseumPublicVideo) {
  const reference = video.sourceAttribution.reference
  return /^https:\/\/(?:youtu\.be\/[a-zA-Z0-9_-]{11}|(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11})$/.test(reference) ? reference : undefined
}

export function isPublicVideoAsset(url: string | undefined, kind: 'video' | 'poster' | 'caption', assets: ReadonlySet<string> = publicMuseumAssetPaths): url is string {
  if (!url || !assets.has(url)) return false
  const directories = { video: 'videos', poster: 'posters', caption: 'captions' }
  const safePath = '(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+\\.[a-zA-Z0-9]+'
  const allowedPath = new RegExp(`^/(?:museum-media|museum/${directories[kind]})/${safePath}$`)
  if (!allowedPath.test(url)) return false
  const extensions = { video: /\.(mp4|webm)$/, poster: /\.(avif|webp|png|jpe?g)$/, caption: /\.vtt$/ }
  return extensions[kind].test(url)
}

export function getPublicVideoVariant(video: MuseumPublicVideo, language: MuseumVideoLanguage, assets: ReadonlySet<string> = publicMuseumAssetPaths) {
  const candidates = video.languageVariants.filter((variant) => variant.language === language)
  if (candidates.length !== 1 || !museumVideoLanguages.some((item) => item.code === language)) return undefined
  const variant = candidates[0]
  if (variant.state !== 'AVAILABLE' || !isPublicVideoAsset(variant.videoUrl, 'video', assets)) return undefined
  if (variant.transcript && (variant.transcript.language !== language || !variant.transcript.text.trim())) return undefined
  if (variant.captionUrl && variant.captionLanguage !== language) return undefined
  if (variant.chapters?.some((chapter, index, chapters) => !Number.isFinite(chapter.startTime) || chapter.startTime < 0
    || !chapter.title.trim() || (index > 0 && chapter.startTime <= chapters[index - 1].startTime))) return undefined
  return variant
}

export function isPublishedPublicVideo(video: MuseumPublicVideo, assets: ReadonlySet<string> = publicMuseumAssetPaths) {
  return video.visibility === 'PUBLIC' && video.publishedStatus === 'PUBLISHED' && video.sourceLanguage === 'vi'
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(video.slug)
    && Boolean(video.title.trim() && video.description.trim() && video.sourceAttribution.label.trim() && video.sourceAttribution.reference.trim()
      && video.rights.confirmed && video.rights.license.trim() && video.rights.credit.trim() && video.rights.verificationReference.trim()
      && getPublicVideoVariant(video, 'vi', assets))
}

export function getPublishedPublicVideos(catalog: readonly MuseumPublicVideo[] = museumPublicVideos, assets: ReadonlySet<string> = publicMuseumAssetPaths) {
  return catalog.filter((video) => catalog.filter((candidate) => candidate.slug === video.slug).length === 1 && isPublishedPublicVideo(video, assets))
}
