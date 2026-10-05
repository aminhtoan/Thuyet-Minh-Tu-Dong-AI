import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const titles: Record<string, string> = { '/dashboard': 'Bảng điều khiển', '/projects': 'Dự án', '/projects/new': 'Dự án mới', '/history': 'Lịch sử', '/settings': 'Cài đặt' }

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const title = /^\/projects\/[^/]+\/transcript$/.test(pathname) ? 'Bản ghi' : /^\/projects\/[^/]+\/translation$/.test(pathname) ? 'Bản dịch' : /^\/projects\/[^/]+\/voice$/.test(pathname) ? 'Giọng đọc và thuyết minh' : /^\/projects\/[^/]+\/generate$/.test(pathname) ? 'Tạo thuyết minh' : /^\/projects\/[^/]+\/result$/.test(pathname) ? 'Kết quả' : titles[pathname] ?? 'Người kể chuyện AI'
  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="sidebar-overlay" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <div className="app-shell__body"><Topbar title={title} sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((open) => !open)} /><main className="app-shell__main"><Outlet /></main></div>
    </div>
  )
}
