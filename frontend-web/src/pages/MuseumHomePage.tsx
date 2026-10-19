import { Link } from 'react-router-dom'
import { MuseumBadge, MuseumCard, MuseumContainer, MuseumSectionHeading } from '../components/museum'
import { Icon } from '../components/common/Icon'
import { session } from '../lib/api'
import '../styles/museum-home.css'

const editorialTopics = [
  { title: 'Lịch sử và ký ức', description: 'Nhìn lại quá khứ qua những câu chuyện được gìn giữ.' },
  { title: 'Câu chuyện con người', description: 'Lắng nghe những góc nhìn và trải nghiệm về chiến tranh.' },
  { title: 'Giá trị của hòa bình', description: 'Dành một khoảng lặng để suy ngẫm và kết nối với hiện tại.' },
]

const narrationLanguages = [
  { code: 'en', name: 'English', label: 'Tiếng Anh' },
  { code: 'th', name: 'Thai', label: 'Tiếng Thái' },
  { code: 'ko', name: 'Korean', label: 'Tiếng Hàn' },
  { code: 'zh-CN', name: 'Simplified Chinese', label: 'Tiếng Trung giản thể' },
]

export function MuseumHomePage() {
  const authenticated = session.isAuthenticated()

  return <div className="museum-home">
    <section className="museum-home__hero" aria-labelledby="museum-home-title">
      <MuseumContainer>
        <div className="museum-home__hero-grid">
          <div className="museum-home__hero-copy">
            <p className="museum-home__eyebrow">Bảo tàng Chứng tích Chiến tranh</p>
            <h1 id="museum-home-title">Những câu chuyện lịch sử <em>từ hiện thực.</em></h1>
            <p className="museum-home__lead">Một không gian để tìm hiểu về chiến tranh, lắng nghe những câu chuyện con người và suy ngẫm về giá trị của hòa bình.</p>
            <div className="museum-home__actions">
              <Link className="museum-home__link museum-home__link--light" to="/kham-pha">Khám phá bảo tàng<Icon name="arrow" width="18" aria-hidden="true" /></Link>
              <Link className="museum-home__link museum-home__link--outline-light" to="/thuyet-minh">Xem thuyết minh</Link>
            </div>
          </div>
          <figure className="museum-home__visual">
            <div className="museum-home__visual-art" aria-hidden="true"><span>KÝ ỨC</span><span className="museum-home__visual-rule" /><span>HÒA BÌNH</span></div>
            <figcaption>Hình ảnh bảo tàng đang được chuẩn bị</figcaption>
          </figure>
        </div>
      </MuseumContainer>
    </section>

    <section className="museum-home__section" aria-labelledby="museum-intro-title">
      <MuseumContainer>
        <div className="museum-home__intro-grid">
          <div><p className="museum-home__eyebrow">Lắng nghe quá khứ</p><h2 id="museum-intro-title">Gìn giữ ký ức.<br />Kết nối hôm nay.</h2></div>
          <div className="museum-home__intro-copy"><p>Bảo tàng Chứng tích Chiến tranh là điểm khởi đầu cho hành trình tìm hiểu lịch sử qua những câu chuyện về chiến tranh và con người.</p><p>Website hướng đến trải nghiệm khám phá và lắng nghe thuyết minh, giúp người xem tiếp cận nội dung bảo tàng bằng nhiều ngôn ngữ.</p><Link className="museum-home__text-link" to="/ve-bao-tang">Tìm hiểu về bảo tàng<Icon name="arrow" width="18" aria-hidden="true" /></Link></div>
        </div>
      </MuseumContainer>
    </section>

    <section className="museum-home__section museum-home__section--surface" aria-label="Không gian trưng bày">
      <MuseumContainer>
        <MuseumSectionHeading eyebrow="Những góc nhìn" title="Không gian trưng bày" description="Các chủ đề biên tập dự kiến. Nội dung trưng bày sẽ được giới thiệu sau khi được duyệt." />
        <div className="museum-home__topics">
          {editorialTopics.map((topic, index) => <MuseumCard key={topic.title} className="museum-home__topic" padding="lg">
            <div className="museum-home__topic-top"><span className="museum-home__topic-index" aria-hidden="true">0{index + 1}</span><MuseumBadge>Đang chuẩn bị</MuseumBadge></div>
            <h3>{topic.title}</h3><p>{topic.description}</p>
          </MuseumCard>)}
        </div>
        <Link className="museum-home__text-link museum-home__section-link" to="/kham-pha">Đến trang Khám phá<Icon name="arrow" width="18" aria-hidden="true" /></Link>
      </MuseumContainer>
    </section>

    <section className="museum-home__section" aria-label="Thuyết minh đa ngôn ngữ">
      <MuseumContainer>
        <MuseumSectionHeading eyebrow="Một câu chuyện, nhiều ngôn ngữ" title="Lắng nghe theo cách của bạn" description="Ngôn ngữ gốc: Tiếng Việt (vi). Các ngôn ngữ thuyết minh dự kiến bên dưới đang được chuẩn bị." />
        <ul className="museum-home__languages" aria-label="Ngôn ngữ thuyết minh dự kiến">
          {narrationLanguages.map((language) => <li key={language.code}>
            <span className="museum-home__language-code">{language.code}</span>
            <h3>{language.label}</h3><p lang="en">{language.name}</p><span className="museum-home__language-state">Đang chuẩn bị</span>
          </li>)}
        </ul>
      </MuseumContainer>
    </section>

    <section className="museum-home__section museum-home__section--surface" aria-labelledby="museum-video-title">
      <MuseumContainer>
        <div className="museum-home__video-grid">
          <div className="museum-home__video-empty">
            <div className="museum-home__poster-art" aria-hidden="true"><span>THUYẾT MINH<br />BẢO TÀNG</span></div>
            <div className="museum-home__poster-caption"><span className="museum-home__video-mark" aria-hidden="true"><Icon name="video" width="24" height="24" /></span><p>Video đang được chuẩn bị</p></div>
          </div>
          <div className="museum-home__video-copy"><p className="museum-home__eyebrow">Thuyết minh nổi bật</p><h2 id="museum-video-title">Một hành trình qua những câu chuyện</h2><p>Video thuyết minh về Bảo tàng Chứng tích Chiến tranh sẽ được giới thiệu tại đây khi sẵn sàng.</p><Link className="museum-home__link museum-home__link--primary" to="/thuyet-minh">Đến trang Thuyết minh<Icon name="arrow" width="18" aria-hidden="true" /></Link></div>
        </div>
      </MuseumContainer>
    </section>

    <section className="museum-home__closing" aria-labelledby="museum-closing-title">
      <MuseumContainer><div className="museum-home__closing-row">
        <div><p className="museum-home__eyebrow">Tiếp nối hành trình</p><h2 id="museum-closing-title">Dành thời gian để khám phá.</h2><p>Mỗi câu chuyện là một lời mời tìm hiểu và suy ngẫm.</p></div>
        <div className="museum-home__actions"><Link className="museum-home__link museum-home__link--primary" to="/kham-pha">Bắt đầu khám phá<Icon name="arrow" width="18" aria-hidden="true" /></Link>{authenticated && <Link className="museum-home__text-link" to="/dashboard">Không gian biên tập</Link>}</div>
      </div></MuseumContainer>
    </section>
  </div>
}
