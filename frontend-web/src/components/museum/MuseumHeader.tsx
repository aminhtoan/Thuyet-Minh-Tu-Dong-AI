import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { session } from '../../lib/api'
import { MuseumButton } from './MuseumButton'
import { MuseumContainer } from './MuseumContainer'
import { MuseumNavigation } from './MuseumNavigation'

function MuseumLanguageSelector({ id }: { id: string }) {
  return <label className="museum-language" htmlFor={id}>
    <span className="visually-hidden">Ngôn ngữ giao diện</span>
    <select id={id} value="vi" disabled>
      <option value="vi">Tiếng Việt</option>
      <option value="en" disabled>English</option>
      <option value="th" disabled>ไทย (Thai)</option>
      <option value="ko" disabled>한국어 (Korean)</option>
      <option value="zh-CN" disabled>简体中文 (Simplified Chinese)</option>
    </select>
  </label>
}

function MuseumHeaderActions({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const authenticated = session.isAuthenticated()
  return <div className="museum-header__actions">
    <MuseumLanguageSelector id={mobile ? 'museum-mobile-language' : 'museum-language'} />
    <Link className="museum-workspace-link" to={authenticated ? '/dashboard' : '/login'} onClick={onNavigate}>
      {authenticated ? 'Không gian biên tập' : 'Đăng nhập'}
    </Link>
  </div>
}

export function MuseumHeader() {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    const previousOverflow = document.body.style.overflow
    const trigger = triggerRef.current
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    const desktop = window.matchMedia('(min-width: 1280px)')
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      desktop.removeEventListener('change', closeOnDesktop)
      dialog.close()
      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [open])

  return <header className="museum-header">
    <MuseumContainer>
      <div className="museum-header__row">
        <Link to="/" className="museum-brand">BẢO TÀNG<span>CHỨNG TÍCH CHIẾN TRANH</span></Link>
        <div className="museum-header__desktop"><MuseumNavigation /><MuseumHeaderActions /></div>
        <button ref={triggerRef} type="button" className="museum-menu-trigger" aria-expanded={open} aria-controls="museum-mobile-menu" aria-haspopup="dialog" onClick={() => setOpen(true)}>Menu</button>
      </div>
    </MuseumContainer>
    <dialog ref={dialogRef} id="museum-mobile-menu" className="museum-mobile-menu" aria-labelledby="museum-menu-title" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <div className="museum-mobile-menu__heading"><h2 id="museum-menu-title">Điều hướng bảo tàng</h2><MuseumButton variant="ghost" onClick={() => setOpen(false)}>Đóng</MuseumButton></div>
      <MuseumNavigation onNavigate={() => setOpen(false)} />
      <MuseumHeaderActions mobile onNavigate={() => setOpen(false)} />
    </dialog>
  </header>
}
