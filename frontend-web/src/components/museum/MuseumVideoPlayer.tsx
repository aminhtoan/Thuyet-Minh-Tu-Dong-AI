import { useEffect, useRef, useState } from 'react'
import { MuseumButton } from './MuseumButton'
import { getPublicVideoVariant, isPublishedPublicVideo, isPublicVideoAsset, type MuseumPublicVideo, type MuseumVideoLanguage, type MuseumVideoVariant } from '../../features/museum/publicVideos'

type PlayerProps = { video: MuseumPublicVideo; language: MuseumVideoLanguage }

function LoadedMuseumVideo({ variant, title, poster, onRetry }: { variant: MuseumVideoVariant; title: string; poster?: string; onRetry: () => void }) {
  const [state, setState] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING')
  const [captionError, setCaptionError] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)
  const captionReady = isPublicVideoAsset(variant.captionUrl, 'caption') && variant.captionLanguage === variant.language
  useEffect(() => {
    if (state !== 'LOADING') return
    const timer = window.setTimeout(() => setState('ERROR'), 15_000)
    return () => window.clearTimeout(timer)
  }, [state])
  useEffect(() => {
    const media = ref.current
    return () => { media?.pause() }
  }, [])

  return <div className="museum-video__player">
    {state === 'ERROR' ? <div className="museum-video__player-state" role="alert"><h2>Không thể tải video</h2><p>Tệp có thể không còn khả dụng hoặc kết nối bị gián đoạn.</p><MuseumButton variant="secondary" onClick={onRetry}>Thử tải lại</MuseumButton></div> : <>
      <video ref={ref} controls playsInline preload="metadata" src={variant.videoUrl} poster={poster} aria-label={`${title} — ${variant.language}`} lang={variant.language}
        onLoadedMetadata={() => setState((current) => current === 'ERROR' ? current : 'READY')} onCanPlay={() => setState((current) => current === 'ERROR' ? current : 'READY')} onError={() => setState('ERROR')}>
        {captionReady && <track kind="captions" src={variant.captionUrl} srcLang={variant.language} label={`Phụ đề ${variant.language}`} default onError={() => setCaptionError(true)} />}
        Trình duyệt của bạn chưa hỗ trợ phát video HTML5.
      </video>
      {state === 'LOADING' && <p className="museum-video__loading" role="status">Đang tải video...</p>}
    </>}
    {(captionError || (variant.captionUrl && !captionReady)) && <p className="museum-video__caption-notice" role="status">Không thể tải phụ đề cho ngôn ngữ này.</p>}
  </div>
}

export function MuseumVideoPlayer({ video, language }: PlayerProps) {
  const [attempt, setAttempt] = useState(0)
  const variant = isPublishedPublicVideo(video) ? getPublicVideoVariant(video, language) : undefined
  if (!variant) return <div className="museum-video__player-state"><p>Video đang được chuẩn bị</p></div>
  return <LoadedMuseumVideo key={`${video.slug}:${language}:${variant.videoUrl}:${variant.captionUrl}:${attempt}`} variant={variant} title={video.title}
    poster={isPublicVideoAsset(video.posterUrl, 'poster') ? video.posterUrl : undefined} onRetry={() => setAttempt((value) => value + 1)} />
}
