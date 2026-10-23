import { Link } from 'react-router-dom'
import { MuseumCard, MuseumContainer, MuseumSectionHeading } from '../components/museum'

export function MuseumPlaceholderPage({ title, notFound = false }: { title: string; notFound?: boolean }) {
  return <MuseumContainer><section className="museum-placeholder">
    <MuseumSectionHeading level="h1" eyebrow="Bảo tàng Chứng tích Chiến tranh" title={title} />
    <MuseumCard padding="lg">
      <h2>{notFound ? 'Đường dẫn không tồn tại' : 'Thông tin bảo tàng'}</h2>
      <p>{notFound ? 'Bạn có thể quay về trang chủ hoặc sử dụng điều hướng bảo tàng.' : 'Chưa có nội dung công khai.'}</p>
      {notFound && <Link to="/" className="museum-workspace-link">Về trang chủ</Link>}
    </MuseumCard>
  </section></MuseumContainer>
}
