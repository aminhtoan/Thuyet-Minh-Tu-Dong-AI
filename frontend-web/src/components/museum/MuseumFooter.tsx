import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MuseumContainer } from './MuseumContainer'

const DEFAULT_MOBILE_URL = 'https://sempiternal-maddison-reservedly.ngrok-free.dev/api/qr/visit?source=footer_web&target=/thuyet-minh'

export function MuseumFooter() {
  const isMounted = typeof window !== 'undefined'
  const [isModalOpen, setIsModalOpen] = useState(false)
  const mobileUrl = isMounted ? DEFAULT_MOBILE_URL : ''
  const qrCodeSrc = isMounted
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=${encodeURIComponent(DEFAULT_MOBILE_URL)}`
    : ''
  const modalQrSrc = isMounted
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(DEFAULT_MOBILE_URL)}`
    : ''

  useEffect(() => {
    if (!isModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  return (
    <>
      <footer className="museum-footer">
        <MuseumContainer>
          <div className="museum-footer__row">
            <p className="museum-footer__brand">
              BẢO TÀNG<span>CHỨNG TÍCH CHIẾN TRANH</span>
            </p>
            <div className="museum-footer__group">
              <p className="museum-footer__group-title">Khám phá</p>
              <nav aria-label="Khám phá — cuối trang">
                <Link to="/">Trang chủ</Link>
                <Link to="/kham-pha">Khám phá bảo tàng</Link>
                <Link to="/ve-bao-tang">Về bảo tàng</Link>
              </nav>
            </div>
            <div className="museum-footer__group">
              <p className="museum-footer__group-title">Thuyết minh</p>
              <nav aria-label="Thuyết minh — cuối trang">
                <Link to="/thuyet-minh">Thuyết minh đa ngôn ngữ</Link>
              </nav>
            </div>
            <div className="museum-footer__group museum-footer__mobile-card">
              <p className="museum-footer__group-title">Trải nghiệm bản Mobile</p>
              <div className="museum-footer__mobile-box">
                <button
                  type="button"
                  className="museum-footer__qr-btn"
                  onClick={() => setIsModalOpen(true)}
                  aria-label="Phóng to mã QR để quét"
                  title="Bấm để phóng to mã QR"
                >
                  {isMounted ? (
                    <img
                      src={qrCodeSrc}
                      alt="Mã QR mở ứng dụng di động"
                      className="museum-footer__qr-img"
                      width={80}
                      height={80}
                      loading="lazy"
                    />
                  ) : (
                    <span className="museum-footer__qr-img" style={{ width: 80, height: 80, display: 'inline-block' }} />
                  )}
                </button>
                <div className="museum-footer__mobile-meta">
                  <span className="museum-footer__mobile-badge">Quét để dùng ngay</span>
                  <button
                    type="button"
                    className="museum-footer__zoom-btn"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Phóng to mã QR ⤢
                  </button>
                  {isMounted && mobileUrl && (
                    <a
                      href={mobileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="museum-footer__mobile-link"
                    >
                      Mở trực tiếp ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </MuseumContainer>
      </footer>

      {isModalOpen && (
        <div
          className="museum-qr-modal__backdrop"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="museum-qr-modal__card"
            role="dialog"
            aria-modal="true"
            aria-label="Mã QR di động"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="museum-qr-modal__close"
              onClick={() => setIsModalOpen(false)}
              aria-label="Đóng"
            >
              ✕
            </button>
            <img
              src={modalQrSrc}
              alt="Mã QR di động"
              width={280}
              height={280}
              className="museum-qr-modal__img"
            />
          </div>
        </div>
      )}
    </>
  )
}

