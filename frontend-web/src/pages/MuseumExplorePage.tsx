import { Link } from 'react-router-dom'
import { MuseumCard, MuseumContainer, MuseumSectionHeading } from '../components/museum'
import { MuseumBreadcrumb } from '../components/museum/MuseumBreadcrumb'
import { getPublishedExhibitions, isMuseumPublicImage } from '../features/museum/exhibitions'
import '../styles/museum-explore.css'

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
        <p>Không gian trưng bày là nơi kết nối câu chuyện, hình ảnh và tư liệu, gợi mở những suy ngẫm về con người và giá trị của hòa bình. Các chuyên đề sẽ được giới thiệu tại đây khi nội dung sẵn sàng để công bố.</p>
      </section>
      <section className="museum-explore__catalog" aria-label="Các chuyên đề">
        <MuseumSectionHeading eyebrow="Hành trình tìm hiểu" title="Các chuyên đề" />
        {exhibitions.length > 0 ? <div className="museum-explore__grid">
          {exhibitions.map((entry) => <MuseumCard key={entry.slug} className="museum-explore__card" padding="lg">
            {isMuseumPublicImage(entry.image) ? <img className="museum-explore__card-image" src={entry.image.src} alt={entry.image.alt} width="720" height="480" loading="lazy" /> : <div className="museum-explore__card-visual"><span>Hình ảnh đang được chuẩn bị</span></div>}
            <h3><Link to={`/kham-pha/${entry.slug}`}>{entry.title}</Link></h3><p>{entry.summary}</p>
          </MuseumCard>)}
        </div> : <MuseumCard className="museum-explore__empty" padding="lg">
          <div className="museum-explore__empty-visual" aria-hidden="true"><span>Ký ức &amp; hòa bình</span></div>
          <div><h3>Chuyên đề đang được chuẩn bị</h3><p>Nội dung giới thiệu chuyên đề chưa sẵn sàng để công bố. Mời bạn quay lại sau để tiếp tục khám phá.</p><Link className="museum-explore__text-link" to="/thuyet-minh">Đến trang Thuyết minh</Link></div>
        </MuseumCard>}
      </section>
    </MuseumContainer>
  </div>
}
