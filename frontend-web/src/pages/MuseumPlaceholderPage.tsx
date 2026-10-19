import { Link } from 'react-router-dom'
import { MuseumCard, MuseumContainer, MuseumSectionHeading } from '../components/museum'

export function MuseumPlaceholderPage({ title, notFound = false }: { title: string; notFound?: boolean }) {
  return <MuseumContainer><section className="museum-placeholder">
    <MuseumSectionHeading level="h1" eyebrow="Bảo tàng Chứng tích Chiến tranh" title={title} />
    <MuseumCard padding="lg">
      <h2>{notFound ? 'Đường dẫn không tồn tại' : 'Nội dung đang được chuẩn bị'}</h2>
      <p>{notFound ? 'Bạn có thể quay về trang chủ hoặc sử dụng điều hướng bảo tàng.' : 'Trang này chưa có nội dung công khai được duyệt. Vui lòng quay lại sau.'}</p>
      {notFound && <Link to="/" className="museum-workspace-link">Về trang chủ</Link>}
    </MuseumCard>
  </section></MuseumContainer>
}
