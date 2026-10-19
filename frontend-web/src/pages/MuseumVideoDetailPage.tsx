import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MuseumContainer, MuseumSectionHeading } from '../components/museum'
import { MuseumVideoPlayer } from '../components/museum/MuseumVideoPlayer'
import { MuseumVideoLanguages } from '../components/museum/MuseumVideoLanguages'
import { getPublishedPublicVideos, getPublicVideoVariant, getPublicVideoSourceUrl, museumVideoLanguages, type MuseumPublicVideo, type MuseumVideoLanguage } from '../features/museum/publicVideos'
import '../styles/museum-video.css'

function VideoExperience({ video }: { video: MuseumPublicVideo }) {
  const [language, setLanguage] = useState<MuseumVideoLanguage>('vi')
  const variant = getPublicVideoVariant(video, language)
  const languageName = museumVideoLanguages.find((item) => item.code === language)?.name
  const chapters = variant?.chapters && variant.chapters.length > 0 ? <><h3>Các phần trong video</h3><ul>{variant.chapters.map((chapter) => <li key={chapter.startTime}><span>{Math.floor(chapter.startTime / 60).toString().padStart(2, '0')}:{Math.floor(chapter.startTime % 60).toString().padStart(2, '0')}</span> {chapter.title}</li>)}</ul></> : null
  return <>
    <MuseumVideoLanguages video={video} selected={language} onChange={setLanguage} />
    <div className={`museum-video__experience${variant?.transcript ? ' museum-video__experience--with-transcript' : ''}`}>
      <MuseumVideoPlayer video={video} language={language} />
      {variant?.transcript && <section className="museum-video__transcript" aria-label={`Bản ghi — ${languageName}`}>
        <h2>Bản ghi <span>{languageName}</span></h2>
        <p className="museum-video__transcript-text" lang={language}>{variant.transcript.text}</p>{chapters}
      </section>}
    </div>
    {!variant?.transcript && <div className="museum-video__transcript-empty"><p>Chưa có bản ghi công khai cho ngôn ngữ này.</p>{chapters}</div>}
  </>
}

export function MuseumVideoDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const video = getPublishedPublicVideos().find((entry) => entry.slug === slug)
  const sourceUrl = video ? getPublicVideoSourceUrl(video) : undefined
  return <div className="museum-video"><MuseumContainer>
    <nav aria-label="Đường dẫn trang" className="museum-video__breadcrumb"><ol><li><Link to="/">Trang chủ</Link></li><li><Link to="/thuyet-minh">Thuyết minh</Link></li><li aria-current="page">{video?.title ?? 'Không tìm thấy video'}</li></ol></nav>
    {video ? <article className="museum-video__detail">
      <MuseumSectionHeading level="h1" eyebrow="Video thuyết minh" title={video.title} description={video.description} />
      <VideoExperience key={video.slug} video={video} />
      <aside className="museum-video__source" aria-label="Nguồn và quyền sử dụng"><h2>Nguồn và quyền sử dụng</h2><p>{sourceUrl ? <a className="museum-video__text-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">{video.rights.credit}</a> : video.rights.credit}</p>{!sourceUrl && <p>{video.sourceAttribution.label} — {video.sourceAttribution.reference}</p>}<p className="museum-video__rights">{video.rights.license}</p></aside>
      <div className="museum-video__actions"><Link to="/thuyet-minh" className="museum-video__text-link">Quay lại danh sách video</Link><Link to="/kham-pha" className="museum-workspace-link">Khám phá bảo tàng</Link></div>
    </article> : <section className="museum-video__empty"><MuseumSectionHeading level="h1" title="Không tìm thấy video" /><p>Đường dẫn này chưa có video được công bố.</p><Link to="/thuyet-minh" className="museum-video__text-link">Quay lại danh sách video</Link></section>}
  </MuseumContainer></div>
}
