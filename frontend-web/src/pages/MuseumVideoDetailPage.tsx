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
  const sourceUrl = getPublicVideoSourceUrl(video)
  // Shorten only the redundant source-link label; never normalize author credits.
  const credit = sourceUrl && video.rights.credit === `Nguồn video: ${video.sourceAttribution.label} — xem video gốc`
    ? video.sourceAttribution.label : video.rights.credit
  const chapters = variant?.chapters && variant.chapters.length > 0 ? <><h3>Các phần trong video</h3><ul>{variant.chapters.map((chapter) => <li key={chapter.startTime}><span>{Math.floor(chapter.startTime / 60).toString().padStart(2, '0')}:{Math.floor(chapter.startTime % 60).toString().padStart(2, '0')}</span> {chapter.title}</li>)}</ul></> : null
  return <>
    <MuseumVideoLanguages video={video} selected={language} onChange={setLanguage} />
    <div className={`museum-video__experience${variant?.transcript ? ' museum-video__experience--with-transcript' : ''}`}>
      <MuseumVideoPlayer video={video} language={language} />
      <p className="museum-video__credit">
        {sourceUrl && <><a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="museum-video__source-link">Nguồn video gốc<span className="visually-hidden"> (mở trong thẻ mới)</span></a>{' '}<span aria-hidden="true">·</span>{' '}</>}
        <span className="museum-video__credit-details">{credit}{!sourceUrl && <> — {video.sourceAttribution.label} — {video.sourceAttribution.reference}</>}{' '}<span aria-hidden="true">·</span>{' '}{video.rights.license}</span>
      </p>
      {variant?.transcript && <section className="museum-video__transcript" aria-label={`Bản ghi — ${languageName}`}>
        <h2>Bản ghi <span>{languageName}</span></h2>
        <p className="museum-video__transcript-text" lang={language}>{variant.transcript.text}</p>{chapters}
      </section>}
    </div>
    {!variant?.transcript && chapters && <section className="museum-video__chapters" aria-label="Các phần trong video">{chapters}</section>}
  </>
}

export function MuseumVideoDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const video = getPublishedPublicVideos().find((entry) => entry.slug === slug)
  return <div className="museum-video museum-video--detail"><MuseumContainer>
    <nav aria-label="Đường dẫn trang" className="museum-video__breadcrumb"><ol><li><Link to="/">Trang chủ</Link></li><li><Link to="/thuyet-minh">Thuyết minh</Link></li><li aria-current="page">{video?.title ?? 'Không tìm thấy video'}</li></ol></nav>
    {video ? <article className="museum-video__detail">
      <MuseumSectionHeading level="h1" eyebrow="Video thuyết minh" title={video.title} description={video.description} />
      <VideoExperience key={video.slug} video={video} />
      <nav className="museum-video__actions" aria-label="Tiếp tục khám phá"><Link to="/thuyet-minh" className="museum-video__text-link museum-video__back-link">Quay lại danh sách video</Link><Link to="/kham-pha" className="museum-workspace-link">Khám phá bảo tàng</Link></nav>
    </article> : <section className="museum-video__empty"><MuseumSectionHeading level="h1" title="Không tìm thấy video" /><p>Đường dẫn này chưa có video được công bố.</p><Link to="/thuyet-minh" className="museum-video__text-link">Quay lại danh sách video</Link></section>}
  </MuseumContainer></div>
}
