import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { navigationLabels } from '../../localization/navigationLabels.mjs'
import { getDrawerTabTarget } from './drawerFocus.mjs'

const titles: Record<string, string> = { '/dashboard': navigationLabels.dashboard, '/projects': navigationLabels.projects, '/projects/new': navigationLabels.create, '/history': navigationLabels.history, '/settings': navigationLabels.account }
if (import.meta.env.DEV) titles['/design-preview/voice'] = 'Giọng đọc — Design Preview'
const drawerQuery = '(max-width: 1023px)'
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState(() => typeof window !== 'undefined' && window.matchMedia(drawerQuery).matches)
  const { pathname } = useLocation()
  const sidebarRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const title = /^\/projects\/[^/]+\/transcript$/.test(pathname) ? 'Bản ghi' : /^\/projects\/[^/]+\/translation$/.test(pathname) ? 'Bản dịch' : /^\/projects\/[^/]+\/voice$/.test(pathname) ? 'Giọng đọc và thuyết minh' : /^\/projects\/[^/]+\/generate$/.test(pathname) ? 'Tạo thuyết minh' : /^\/projects\/[^/]+\/result$/.test(pathname) ? 'Kết quả' : titles[pathname] ?? 'Người kể chuyện AI'

  const closeSidebar = useCallback((restoreFocus = true) => {
    setSidebarOpen(false)
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus())
  }, [])

  useEffect(() => {
    const media = window.matchMedia(drawerQuery)
    const updateMode = (matches: boolean) => {
      setDrawerMode(matches)
      if (!matches) setSidebarOpen(false)
    }
    updateMode(media.matches)
    const onChange = (event: MediaQueryListEvent) => updateMode(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!drawerMode || !sidebarOpen) return
    const sidebar = sidebarRef.current
    if (!sidebar) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = requestAnimationFrame(() => sidebar.querySelector<HTMLElement>('[data-sidebar-initial-focus]')?.focus())

    function handleDrawerKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSidebar()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...sidebar!.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => !element.hasAttribute('disabled'))
      const target = getDrawerTabTarget(focusable.indexOf(document.activeElement as HTMLElement), focusable.length, event.shiftKey)
      if (target !== null) {
        event.preventDefault()
        focusable[target]?.focus()
      }
    }

    document.addEventListener('keydown', handleDrawerKeyDown)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleDrawerKeyDown)
    }
  }, [closeSidebar, drawerMode, sidebarOpen])

  return (
    <div className="app-shell">
      <Sidebar asideRef={sidebarRef} drawer={drawerMode} open={sidebarOpen} onClose={() => closeSidebar()} onNavigate={() => closeSidebar()} />
      {drawerMode && sidebarOpen && <button className="sidebar-overlay" type="button" tabIndex={-1} aria-hidden="true" onClick={() => closeSidebar()} />}
      <div className="app-shell__body" aria-hidden={drawerMode && sidebarOpen ? true : undefined} inert={drawerMode && sidebarOpen ? true : undefined}><Topbar menuButtonRef={menuButtonRef} title={title} sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((open) => !open)} /><main className="app-shell__main"><Outlet /></main></div>
    </div>
  )
}
