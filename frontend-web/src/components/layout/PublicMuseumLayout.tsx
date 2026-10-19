import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MuseumHeader } from '../museum/MuseumHeader'
import { MuseumFooter } from '../museum/MuseumFooter'
import '../../styles/museum-layout.css'

export function PublicMuseumLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(location.pathname)
  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname
      mainRef.current?.focus()
    }
  }, [location.pathname])
  return <div className="museum-theme museum-public-layout">
    <a className="museum-skip-link" href="#museum-main">Chuyển đến nội dung chính</a>
    <MuseumHeader key={location.key} />
    <main id="museum-main" className="museum-main" tabIndex={-1} ref={mainRef}><Outlet /></main>
    <MuseumFooter />
  </div>
}
