import { useState, type ReactNode } from 'react'
import { getMuseumHomeImageCandidates, museumDemoImageCaption, museumHomeImages, type MuseumHomeImageSlot } from '../../features/museum/homeImages'

export function MuseumHomeImage({ slot, className = '', children }: {
  slot: MuseumHomeImageSlot; className?: string; children?: ReactNode
}) {
  const [failedSources, setFailedSources] = useState<string[]>([])
  const image = getMuseumHomeImageCandidates(slot).find(candidate => !failedSources.includes(candidate.src))
  const landscape = museumHomeImages[slot].width / museumHomeImages[slot].height > 1.5
  const missing = slot === 'featuredVideo' ? 'Video đang được chuẩn bị' : 'Chưa có hình ảnh'

  // Hide development-only copy, never an individual source/licence credit.
  const caption = image ? (image.caption === museumDemoImageCaption ? undefined : image.caption) : missing
  return <figure className={`museum-home-image ${landscape ? 'museum-home-image--wide' : 'museum-home-image--standard'} ${className}`} data-image-slot={slot}>
    <div className="museum-home-image__frame">
      {image ? <img src={image.src} alt={image.alt} width={image.width} height={image.height}
        loading={slot === 'hero' ? 'eager' : 'lazy'} decoding="async"
        onError={() => setFailedSources(previous => [...previous, image.src])} />
        : <div className="museum-home-image__fallback" aria-hidden="true"><span>{slot === 'featuredVideo' ? 'THUYẾT MINH' : 'KÝ ỨC'}</span><span className="museum-home__visual-rule" /><span>{slot === 'featuredVideo' ? 'BẢO TÀNG' : 'HÒA BÌNH'}</span></div>}
    </div>
    {children}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>
}
