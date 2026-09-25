import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from '../common/Icon'

type SidebarProps = { open: boolean; onNavigate: () => void }
type NavigationItem = { label: string; to: string; icon: IconName; end?: boolean }

const primaryItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
  { label: 'Projects', to: '/projects', icon: 'projects', end: true },
  { label: 'New Project', to: '/projects/new', icon: 'plus' },
  { label: 'History', to: '/history', icon: 'history' },
]

function SidebarLink({ item, onNavigate }: { item: NavigationItem; onNavigate: () => void }) {
  return <NavLink to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}><Icon className="sidebar__icon" name={item.icon} /><span>{item.label}</span></NavLink>
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <aside id="app-sidebar" className={`sidebar${open ? ' sidebar--open' : ''}`} aria-label="Main navigation">
      <NavLink to="/dashboard" className="sidebar__brand" onClick={onNavigate}><span className="sidebar__mark"><Icon name="sparkles" width="20" /></span><span>AI Narrator</span></NavLink>
      <nav className="sidebar__nav">{primaryItems.map((item) => <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />)}</nav>
      <div className="sidebar__bottom"><SidebarLink item={{ label: 'Settings', to: '/settings', icon: 'settings' }} onNavigate={onNavigate} /></div>
    </aside>
  )
}
