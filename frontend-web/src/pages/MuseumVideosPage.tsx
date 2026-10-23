import { Link } from 'react-router-dom'
import { MuseumCard, MuseumContainer, MuseumSectionHeading } from '../components/museum'
import { getPublishedPublicVideos, isPublicVideoAsset } from '../features/museum/publicVideos'
import '../styles/museum-video.css'

export function MuseumVideosPage() {
  const videos = getPublishedPublicVideos()
  return <div className="museum-video museum-video--listing">
    <div className="museum-video__hero"><MuseumContainer>
      <nav aria-label="Đường dẫn trang" className="museum-video__breadcrumb"><ol><li><Link to="/">Trang chủ</Link></li><li aria-current="page">Thuyết minh</li></ol></nav>
      <MuseumSectionHeading level="h1" eyebrow="Bảo tàng Chứng tích Chiến tranh" title="Thuyết minh bảo tàng" description="Lắng nghe những câu chuyện lịch sử qua video và ngôn ngữ của bạn." />
    </MuseumContainer></div>
    <MuseumContainer><section className="museum-video__list" aria-label="Video đã công bố">
      {videos.length ? <div className={`museum-video__cards${videos.length === 1 ? ' museum-video__cards--featured' : ''}`}>{videos.map((video) => <MuseumCard key={video.slug} className="museum-video__card" padding="lg">
        <div className="museum-video__card-media">{isPublicVideoAsset(video.posterUrl, 'poster') ? <img className="museum-video__poster" src={video.posterUrl} alt="" width="640" height="360" loading={videos.length === 1 ? 'eager' : 'lazy'} /> : <div className="museum-video__poster-placeholder" aria-hidden="true">Thuyết minh bảo tàng</div>}</div>
        <div className="museum-video__card-copy"><h2><Link to={`/thuyet-minh/${video.slug}`}>{video.title}</Link></h2><p>{video.description}</p>
        <Link className="museum-workspace-link museum-video__watch-link" to={`/thuyet-minh/${video.slug}`} aria-label={`Xem video: ${video.title}`}><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7Z" /></svg>Xem video</Link></div>
      </MuseumCard>)}</div> : <MuseumCard className="museum-video__empty" padding="lg"><p className="museum-video__eyebrow">Video thuyết minh</p><h2>Chưa có video</h2><p>Chưa có video được công bố.</p><Link className="museum-video__text-link" to="/kham-pha">Khám phá bảo tàng</Link></MuseumCard>}
    </section></MuseumContainer>
  </div>
}
