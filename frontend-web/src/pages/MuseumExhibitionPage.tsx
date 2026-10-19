import { Link, useParams } from 'react-router-dom'
import { MuseumCard, MuseumContainer, MuseumSectionHeading } from '../components/museum'
import { MuseumBreadcrumb } from '../components/museum/MuseumBreadcrumb'
import { getPublishedExhibitions, isMuseumPublicImage } from '../features/museum/exhibitions'
import '../styles/museum-explore.css'

export function MuseumExhibitionPage() {
  const { slug } = useParams<{ slug: string }>()
  const entry = getPublishedExhibitions().find((candidate) => candidate.slug === slug)
  if (!entry) return <div className="museum-explore"><MuseumContainer>
    <MuseumBreadcrumb current="Không tìm thấy chuyên đề" detail />
    <section className="museum-explore__not-found">
      <MuseumSectionHeading level="h1" title="Không tìm thấy chuyên đề" />
      <p>Đường dẫn này chưa có chuyên đề được công bố.</p>
      <Link to="/kham-pha" className="museum-explore__text-link">Quay lại Khám phá</Link>
    </section>
  </MuseumContainer></div>

  return <article className="museum-explore museum-exhibition">
    <div className="museum-explore__hero"><MuseumContainer>
      <MuseumBreadcrumb current={entry.title} detail />
      <MuseumSectionHeading level="h1" eyebrow="Chuyên đề" title={entry.title} description={entry.summary} />
    </MuseumContainer></div>
    <MuseumContainer size="readable">
      {isMuseumPublicImage(entry.image) ? <figure className="museum-exhibition__figure"><img src={entry.image.src} alt={entry.image.alt} width="1200" height="800" /><figcaption>{entry.image.caption}<span>{entry.image.credit}</span></figcaption></figure> : <MuseumCard className="museum-exhibition__image-placeholder" padding="lg"><p>Hình ảnh chuyên đề đang được chuẩn bị</p></MuseumCard>}
      <div className="museum-exhibition__body">{entry.sections.map((section, index) => <section key={index}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</section>)}</div>
      <aside className="museum-exhibition__source" aria-label="Nguồn nội dung"><p>Nguồn: {entry.source.label}</p><p>{entry.source.reference}</p></aside>
      <div className="museum-exhibition__actions"><Link to="/kham-pha" className="museum-explore__text-link">Quay lại Khám phá</Link><Link to="/thuyet-minh" className="museum-workspace-link">Xem thuyết minh</Link></div>
    </MuseumContainer>
  </article>
}
