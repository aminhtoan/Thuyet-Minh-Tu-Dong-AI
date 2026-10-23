import { publicMuseumAssetPaths } from './publicMediaAssets'
import { isPublicVideoAsset, museumPublicVideos, type MuseumPublicVideo } from './publicVideos'

// Presentation slots only: adding an image never publishes an exhibition/video.
export const museumHomeImages = {
  hero: { src: '/museum/images/hero.jpg', alt: 'Không gian Bảo tàng Chứng tích Chiến tranh', width: 1600, height: 900 },
  museumIntro: { src: '/museum/images/museum-intro.jpg', alt: 'Hình ảnh giới thiệu bảo tàng', width: 1200, height: 900 },
  exhibitionHistory: { src: '/museum/images/exhibition-history.jpg', alt: 'Hình ảnh chủ đề Lịch sử và ký ức', width: 800, height: 600 },
  exhibitionPeople: { src: '/museum/images/exhibition-people.jpg', alt: 'Hình ảnh chủ đề Câu chuyện con người', width: 800, height: 600 },
  exhibitionPeace: { src: '/museum/images/exhibition-peace.jpg', alt: 'Hình ảnh chủ đề Giá trị của hòa bình', width: 800, height: 600 },
  featuredVideo: { src: '/museum/images/featured-video.jpg', alt: 'Hình ảnh thuyết minh bảo tàng', width: 1280, height: 720 },
} as const

export type MuseumHomeImageSlot = keyof typeof museumHomeImages
export type MuseumHomeImage = { src: string; alt: string; width: number; height: number; caption: string }
export const museumDemoImageCaption = 'Ảnh minh họa bố cục — không phải tư liệu lịch sử đã xác minh.'

export function getMuseumHomeImageCandidates(
  slot: MuseumHomeImageSlot,
  assets: ReadonlySet<string> = publicMuseumAssetPaths,
  catalog: readonly MuseumPublicVideo[] = museumPublicVideos,
): MuseumHomeImage[] {
  const configured = museumHomeImages[slot]
  const demo = /^\/museum\/images\/[a-z0-9-]+\.(?:avif|webp|png|jpe?g)$/.test(configured.src) && assets.has(configured.src)
    ? [{ ...configured, caption: museumDemoImageCaption }] : []
  if (slot !== 'hero' && slot !== 'featuredVideo') return demo

  // Tie the thumbnail to this actual video, not to an arbitrary catalog entry.
  const video = catalog.find(item => item.slug === 'bao-tang-chung-tich-chien-tranh'
    && item.visibility === 'PUBLIC' && item.publishedStatus === 'PUBLISHED' && item.rights.confirmed
    && isPublicVideoAsset(item.posterUrl, 'poster', assets))
  const poster: MuseumHomeImage[] = video?.posterUrl ? [{
    src: video.posterUrl, width: 640, height: 360,
    alt: 'Không gian ngoài trời trong video giới thiệu Bảo tàng Chứng tích Chiến tranh',
    caption: '',
  }] : []
  return slot === 'featuredVideo' ? [...poster, ...demo] : [...demo, ...poster]
}
