import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const titles: Record<string, string> = { '/dashboard': 'Bảng điều khiển', '/projects': 'Dự án', '/projects/new': 'Dự án mới', '/history': 'Lịch sử', '/settings': 'Cài đặt' }

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const title = /^\/projects\/[^/]+\/transcript$/.test(pathname) ? 'Transcript' : /^\/projects\/[^/]+\/translation$/.test(pathname) ? 'Translation' : /^\/projects\/[^/]+\/voice$/.test(pathname) ? 'Voice & Narration' : /^\/projects\/[^/]+\/generate$/.test(pathname) ? 'Generate Narration' : /^\/projects\/[^/]+\/result$/.test(pathname) ? 'Result' : titles[pathname] ?? 'Người kể chuyện AI'
  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="sidebar-overlay" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <div className="app-shell__body"><Topbar title={title} sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((open) => !open)} /><main className="app-shell__main"><Outlet /></main></div>
    </div>
  )
}
