import { Link } from 'react-router-dom'
import { MuseumCard, MuseumContainer, MuseumSectionHeading } from '../components/museum'
import { MuseumBreadcrumb } from '../components/museum/MuseumBreadcrumb'
import { MuseumHomeImage } from '../components/museum/MuseumHomeImage'
import { getPublishedExhibitions, isMuseumPublicImage } from '../features/museum/exhibitions'
import '../styles/museum-explore.css'

// Presentation previews only, never entries in the published exhibition catalog.
const upcomingExhibitions = [
  { imageSlot: 'exhibitionHistory', title: 'Lịch sử và ký ức', description: 'Nhìn lại quá khứ qua những câu chuyện được gìn giữ.' },
  { imageSlot: 'exhibitionPeople', title: 'Câu chuyện con người', description: 'Lắng nghe những góc nhìn và trải nghiệm về chiến tranh.' },
  { imageSlot: 'exhibitionPeace', title: 'Giá trị của hòa bình', description: 'Dành một khoảng lặng để suy ngẫm và kết nối với hiện tại.' },
] as const

export function MuseumExplorePage() {
  const exhibitions = getPublishedExhibitions()
  return <div className="museum-explore museum-explore--listing">
    <div className="museum-explore__hero"><MuseumContainer>
      <MuseumBreadcrumb current="Khám phá" />
      <MuseumSectionHeading level="h1" eyebrow="Bảo tàng Chứng tích Chiến tranh" title="Khám phá bảo tàng" description="Dành thời gian tìm hiểu, lắng nghe và suy ngẫm về những câu chuyện lịch sử." />
    </MuseumContainer></div>
    <MuseumContainer>
      <section className="museum-explore__intro" aria-labelledby="museum-explore-intro">
        <div className="museum-explore__intro-heading"><p className="museum-explore__eyebrow">Không gian và câu chuyện</p><h2 id="museum-explore-intro">Tiếp cận lịch sử qua từng góc nhìn.</h2></div>
        <p>Không gian trưng bày là nơi kết nối câu chuyện, hình ảnh và tư liệu, gợi mở những suy ngẫm về con người và giá trị của hòa bình.</p>
      </section>
      <section className="museum-explore__catalog" aria-label="Các chuyên đề">
        <MuseumSectionHeading eyebrow="Hành trình tìm hiểu" title="Các chuyên đề" />
        {exhibitions.length > 0 ? <div className="museum-explore__grid">
          {exhibitions.map((entry) => <MuseumCard key={entry.slug} className="museum-explore__card" padding="lg">
            {isMuseumPublicImage(entry.image) ? <img className="museum-explore__card-image" src={entry.image.src} alt={entry.image.alt} width="720" height="480" loading="lazy" /> : <div className="museum-explore__card-visual"><span>Chưa có hình ảnh</span></div>}
            <h3><Link to={`/kham-pha/${entry.slug}`}>{entry.title}</Link></h3><p>{entry.summary}</p>
          </MuseumCard>)}
        </div> : <>
          <div className="museum-explore__grid museum-explore__previews">
            {upcomingExhibitions.map(topic => <MuseumCard key={topic.imageSlot} className="museum-explore__preview" padding="sm">
              <MuseumHomeImage slot={topic.imageSlot} />
              <div className="museum-explore__preview-copy">
                <h3>{topic.title}</h3><p>{topic.description}</p>
              </div>
            </MuseumCard>)}
          </div>
          <Link className="museum-explore__text-link museum-explore__catalog-link" to="/thuyet-minh">Đến trang Thuyết minh</Link>
        </>}
      </section>
    </MuseumContainer>
  </div>
}
