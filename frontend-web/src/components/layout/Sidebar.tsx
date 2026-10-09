import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from '../common/Icon'

type SidebarProps = { open: boolean; onNavigate: () => void }
type NavigationItem = { label: string; to: string; icon: IconName; end?: boolean }

const primaryItems: NavigationItem[] = [
  { label: 'Bảng điều khiển', to: '/dashboard', icon: 'dashboard' },
  { label: 'Dự án của tôi', to: '/projects', icon: 'projects', end: true },
  { label: 'Tạo thuyết minh', to: '/projects/new', icon: 'mic' },
  { label: 'Lịch sử', to: '/history', icon: 'history' },
]

function SidebarLink({ item, onNavigate }: { item: NavigationItem; onNavigate: () => void }) {
  return <NavLink to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}><Icon className="sidebar__icon" name={item.icon} fill="none" stroke="currentColor" strokeWidth={1.7} /><span>{item.label}</span></NavLink>
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <aside id="app-sidebar" className={`sidebar${open ? ' sidebar--open' : ''}`} aria-label="Main navigation">
      <NavLink to="/dashboard" className="sidebar__brand" onClick={onNavigate}><span className="sidebar__mark"><Icon name="wave" width="30" /></span><span>Người kể chuyện AI<small>Thuyết minh đa ngôn ngữ</small></span></NavLink>
      <nav className="sidebar__nav">{primaryItems.map((item) => <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />)}</nav>
      <div className="sidebar__bottom"><div className="sidebar__help"><strong>Sáng tạo không giới hạn</strong><p>Khám phá quy trình thuyết minh đa ngôn ngữ.</p></div><SidebarLink item={{ label: 'Cài đặt', to: '/settings', icon: 'settings' }} onNavigate={onNavigate} /></div>
    </aside>
  )
}
