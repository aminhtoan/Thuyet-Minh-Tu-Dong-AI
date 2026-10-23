import { Link } from 'react-router-dom'
import { MuseumCard, MuseumContainer, MuseumSectionHeading } from '../components/museum'
import { MuseumBreadcrumb } from '../components/museum/MuseumBreadcrumb'
import { MuseumHomeImage } from '../components/museum/MuseumHomeImage'
import '../styles/museum-about.css'

export function MuseumAboutPage() {
  return <div className="museum-about">
    <div className="museum-about__hero"><MuseumContainer>
      <MuseumBreadcrumb current="Về bảo tàng" />
      <MuseumSectionHeading level="h1" eyebrow="Bảo tàng Chứng tích Chiến tranh" title="Về bảo tàng"
        description="Một không gian để tìm hiểu về chiến tranh, lắng nghe những câu chuyện con người và suy ngẫm về giá trị của hòa bình." />
    </MuseumContainer></div>
    <MuseumContainer>
      <section className="museum-about__intro" aria-labelledby="museum-about-intro">
        <MuseumHomeImage slot="museumIntro" />
        <div className="museum-about__copy">
          <p className="museum-about__eyebrow">Lắng nghe quá khứ</p>
          <h2 id="museum-about-intro">Gìn giữ ký ức. Kết nối hôm nay.</h2>
          <p>Bảo tàng Chứng tích Chiến tranh là điểm khởi đầu cho hành trình tìm hiểu lịch sử qua những câu chuyện về chiến tranh và con người.</p>
          <p>Website hướng đến trải nghiệm khám phá và lắng nghe thuyết minh, giúp người xem tiếp cận nội dung bảo tàng bằng nhiều ngôn ngữ.</p>
          <Link className="museum-about__cta" to="/kham-pha">Khám phá bảo tàng <span aria-hidden="true">→</span></Link>
        </div>
      </section>
      <section className="museum-about__information" aria-label="Thông tin và hành trình khám phá">
        <MuseumCard padding="lg" className="museum-about__card">
          <h2>Về bảo tàng</h2>
          <p>Không gian trưng bày là nơi kết nối câu chuyện, hình ảnh và tư liệu, gợi mở những suy ngẫm về con người và giá trị của hòa bình.</p>
        </MuseumCard>
        <MuseumCard padding="lg" className="museum-about__card">
          <h2>Hành trình khám phá</h2>
          <p>Dành thời gian tìm hiểu, lắng nghe và suy ngẫm về những câu chuyện lịch sử. Mỗi câu chuyện là một lời mời tìm hiểu và suy ngẫm.</p>
        </MuseumCard>
      </section>
    </MuseumContainer>
  </div>
}
