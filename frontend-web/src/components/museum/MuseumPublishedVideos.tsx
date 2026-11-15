import { useCallback, useEffect, useRef, useState } from 'react'
import { MuseumButton } from './MuseumButton'
import { MuseumCard } from './MuseumCard'
import { checkPublishedVideo, listPublishedVideos, publishedVideoLanguage, type PublishedNarrationVideo } from '../../features/museum/publishedVideos'

export function PublishedVideoPlayer({ video, onClose, onRetry }: { video: PublishedNarrationVideo; onClose: () => void; onRetry: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const [url, setUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<'CHECKING' | 'LOADING' | 'READY' | 'ERROR'>('CHECKING')
  const release = useCallback(() => {
    const media = ref.current
    if (media) { media.pause(); media.removeAttribute('src'); media.load() }
  }, [])
  const fail = useCallback(() => { window.clearTimeout(timer.current); release(); setUrl(null); setPhase('ERROR') }, [release])
  useEffect(() => {
    const request = new AbortController()
    timer.current = window.setTimeout(() => { request.abort(); fail() }, 15_000)
    void checkPublishedVideo(video, request.signal).then(value => {
      if (!request.signal.aborted) { setUrl(value); setPhase('LOADING') }
    }).catch(() => { if (!request.signal.aborted) fail() })
    return () => { request.abort(); window.clearTimeout(timer.current); release() }
  }, [video, fail, release])
  const ready = () => { window.clearTimeout(timer.current); setPhase(current => current === 'ERROR' ? current : 'READY') }
  return <section className="museum-published-videos__player" aria-label={`Video ${video.title} — ${publishedVideoLanguage(video.languageCode)}`}>
    <h3>{video.title} · {publishedVideoLanguage(video.languageCode)}</h3>
    {phase === 'ERROR' ? <div role="alert"><p>Video đã ngừng công khai, không còn khả dụng hoặc kết nối bị lỗi. Tải lại danh sách để kiểm tra.</p>
      <MuseumButton variant="secondary" onClick={onRetry}>Tải lại danh sách</MuseumButton></div>
      : <>{url && <video ref={ref} src={url} controls playsInline preload="metadata" lang={video.languageCode}
        aria-label={`Phát video ${video.title} — ${publishedVideoLanguage(video.languageCode)}`}
        onLoadedMetadata={ready} onCanPlay={ready} onError={fail}
        onWaiting={() => { window.clearTimeout(timer.current); timer.current = window.setTimeout(fail, 15_000); setPhase(current => current === 'ERROR' ? current : 'LOADING') }} />}
      {phase !== 'READY' && <p role="status" aria-live="polite">{phase === 'CHECKING' ? 'Đang kiểm tra video công khai…' : 'Đang tải video…'}</p>}</>}
    <MuseumButton variant="secondary" onClick={() => { release(); onClose() }}>Đóng video</MuseumButton>
  </section>
}

export function MuseumPublishedVideos() {
  const [videos, setVideos] = useState<PublishedNarrationVideo[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [phase, setPhase] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING')
  const request = useRef<AbortController | null>(null)
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller
    setActive(null); setVideos([]); setPhase('LOADING')
    try { const value = await listPublishedVideos(controller.signal); if (!controller.signal.aborted) { setVideos(value); setPhase('READY') } }
    catch { if (!controller.signal.aborted) setPhase('ERROR') }
  }, [])
  useEffect(() => {
    let disposed = false
    void Promise.resolve().then(() => { if (!disposed) return load() })
    return () => { disposed = true; request.current?.abort() }
  }, [load])
  const selected = videos.find(video => video.id === active)
  return <section className="museum-video__list museum-published-videos" aria-labelledby="published-videos-title">
    <h2 id="published-videos-title">Video thuyết minh</h2>
    <p>Video MP4 thuyết minh đã được quản trị viên công khai.</p>
    {phase === 'LOADING' && <p role="status">Đang tải video thuyết minh…</p>}
    {phase === 'ERROR' && <div role="alert"><p>Không thể tải danh sách video thuyết minh. Vui lòng thử lại.</p><MuseumButton variant="secondary" onClick={() => void load()}>Thử lại</MuseumButton></div>}
    {phase === 'READY' && videos.length === 0 && <p role="status">Chưa có video MP4 thuyết minh được công khai.</p>}
    {phase === 'READY' && videos.length > 0 && <>
      <MuseumButton variant="secondary" onClick={() => void load()}>Tải lại danh sách video</MuseumButton>
      <div className="museum-video__cards">{videos.map(video => <MuseumCard key={video.id} className="museum-video__card" padding="lg">
        <h3>{video.title}</h3><p>Thuyết minh · {publishedVideoLanguage(video.languageCode)} · {Math.round(video.duration)} giây</p>
        <MuseumButton variant="secondary" aria-expanded={active === video.id} aria-controls="published-video-player"
          aria-label={`Xem video ${video.title} — ${publishedVideoLanguage(video.languageCode)}`} onClick={() => setActive(video.id)}>Xem video</MuseumButton>
      </MuseumCard>)}</div>
    </>}
    <div id="published-video-player">{selected && <PublishedVideoPlayer key={selected.id} video={selected} onClose={() => setActive(null)} onRetry={() => void load()} />}</div>
  </section>
}
