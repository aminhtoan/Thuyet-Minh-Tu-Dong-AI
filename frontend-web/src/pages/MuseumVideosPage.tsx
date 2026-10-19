import { Link } from 'react-router-dom'
import { MuseumCard, MuseumContainer, MuseumSectionHeading } from '../components/museum'
import { getPublishedPublicVideos, isPublicVideoAsset } from '../features/museum/publicVideos'
import '../styles/museum-video.css'

export function MuseumVideosPage() {
  const videos = getPublishedPublicVideos()
  return <div className="museum-video">
    <div className="museum-video__hero"><MuseumContainer>
      <nav aria-label="Đường dẫn trang" className="museum-video__breadcrumb"><ol><li><Link to="/">Trang chủ</Link></li><li aria-current="page">Thuyết minh</li></ol></nav>
      <MuseumSectionHeading level="h1" eyebrow="Bảo tàng Chứng tích Chiến tranh" title="Thuyết minh bảo tàng" description="Lắng nghe những câu chuyện lịch sử qua video và ngôn ngữ của bạn." />
    </MuseumContainer></div>
    <MuseumContainer><section className="museum-video__list" aria-label="Video đã công bố">
      {videos.length ? <div className="museum-video__cards">{videos.map((video) => <MuseumCard key={video.slug} padding="lg">
        {isPublicVideoAsset(video.posterUrl, 'poster') ? <img className="museum-video__poster" src={video.posterUrl} alt="" width="960" height="540" loading="lazy" /> : <div className="museum-video__poster-placeholder" aria-hidden="true">Thuyết minh bảo tàng</div>}
        <h2><Link to={`/thuyet-minh/${video.slug}`}>{video.title}</Link></h2><p>{video.description}</p>
      </MuseumCard>)}</div> : <MuseumCard className="museum-video__empty" padding="lg"><p className="museum-video__eyebrow">Video thuyết minh</p><h2>Video đang được chuẩn bị</h2><p>Chưa có video được công bố. Mời bạn quay lại sau để tiếp tục hành trình khám phá.</p><Link className="museum-video__text-link" to="/kham-pha">Khám phá bảo tàng</Link></MuseumCard>}
    </section></MuseumContainer>
  </div>
}
