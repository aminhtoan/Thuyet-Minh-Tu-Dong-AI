import { Link } from 'react-router-dom'
import { MuseumContainer, MuseumSectionHeading } from '../components/museum'
import { MuseumCustomerAudioSection } from '../components/museum/MuseumCustomerAudioSection'
import { MuseumPublishedVideos } from '../components/museum/MuseumPublishedVideos'
import '../styles/museum-video.css'

export function MuseumVideosPage() {
  return (
    <div className="museum-video museum-video--listing">
      <div className="museum-video__hero">
        <MuseumContainer>
          <nav aria-label="Đường dẫn trang" className="museum-video__breadcrumb">
            <ol>
              <li><Link to="/">Trang chủ</Link></li>
              <li aria-current="page">Thuyết minh</li>
            </ol>
          </nav>
          <MuseumSectionHeading
            level="h1"
            eyebrow="Bảo tàng Chứng tích Chiến tranh"
            title="Thuyết minh bảo tàng"
            description="Lắng nghe những câu chuyện lịch sử qua video và ngôn ngữ của bạn."
          />
        </MuseumContainer>
      </div>

      {/* Audio guides from narration library */}
      <MuseumContainer>
        <MuseumCustomerAudioSection />
      </MuseumContainer>

      {/* Published videos from API — single source of truth */}
      <MuseumContainer>
        <MuseumPublishedVideos />
      </MuseumContainer>
    </div>
  )
}
