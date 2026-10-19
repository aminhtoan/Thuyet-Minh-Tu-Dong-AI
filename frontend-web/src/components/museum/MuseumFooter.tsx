import { Link } from 'react-router-dom'
import { MuseumContainer } from './MuseumContainer'

export function MuseumFooter() {
  return <footer className="museum-footer"><MuseumContainer>
    <div className="museum-footer__row">
      <p className="museum-footer__brand">BẢO TÀNG<span>CHỨNG TÍCH CHIẾN TRANH</span></p>
      <div className="museum-footer__group"><p className="museum-footer__group-title">Khám phá</p><nav aria-label="Khám phá — cuối trang"><Link to="/">Trang chủ</Link><Link to="/kham-pha">Khám phá bảo tàng</Link><Link to="/ve-bao-tang">Về bảo tàng</Link></nav></div>
      <div className="museum-footer__group"><p className="museum-footer__group-title">Thuyết minh</p><nav aria-label="Thuyết minh — cuối trang"><Link to="/thuyet-minh">Thuyết minh đa ngôn ngữ</Link></nav></div>
    </div>
    <p className="museum-footer__notice">Website thuyết minh đang được phát triển. Nội dung công khai sẽ được cập nhật sau khi được duyệt.</p>
  </MuseumContainer></footer>
}
