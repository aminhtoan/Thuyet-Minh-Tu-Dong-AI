import { type RefObject } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from '../common/Icon'
import { navigationLabels } from '../../localization/navigationLabels.mjs'
import { MuseumBrandIcon } from './MuseumBrandIcon'

type SidebarProps = {
  asideRef: RefObject<HTMLElement | null>
  drawer: boolean
  open: boolean
  onClose: () => void
  onNavigate: () => void
}
type NavigationItem = { label: string; to: string; icon: IconName; end?: boolean }

const primaryItems: NavigationItem[] = [
  { label: navigationLabels.dashboard, to: '/dashboard', icon: 'dashboard' },
  { label: navigationLabels.projects, to: '/projects', icon: 'projects', end: true },
  { label: navigationLabels.create, to: '/projects/new', icon: 'mic' },
  { label: navigationLabels.history, to: '/history', icon: 'history' },
]

function SidebarLink({ item, onNavigate }: { item: NavigationItem; onNavigate: () => void }) {
  return <NavLink to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}><Icon className="sidebar__icon" name={item.icon} fill="none" stroke="currentColor" strokeWidth={1.7} /><span>{item.label}</span></NavLink>
}

export function Sidebar({ asideRef, drawer, open, onClose, onNavigate }: SidebarProps) {
  return (
    <aside ref={asideRef} id="app-sidebar" className={`sidebar${open ? ' sidebar--open' : ''}`} aria-label="Điều hướng chính" aria-hidden={drawer && !open ? true : undefined} aria-modal={drawer && open ? true : undefined} inert={drawer && !open ? true : undefined} role={drawer ? 'dialog' : undefined}>
      <div className="sidebar__header">
        <NavLink to="/dashboard" className="sidebar__brand" onClick={onNavigate}><span className="sidebar__mark"><MuseumBrandIcon /></span><span className="sidebar__brand-copy">Thuyết minh bảo tàng<small>Nền tảng đa ngôn ngữ</small></span></NavLink>
        <button className="sidebar__close" type="button" aria-label="Đóng điều hướng" onClick={onClose} data-sidebar-initial-focus><Icon name="close" width="20" /></button>
      </div>
      <nav className="sidebar__nav">{primaryItems.map((item) => <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />)}</nav>
      <div className="sidebar__bottom"><SidebarLink item={{ label: navigationLabels.account, to: '/settings', icon: 'settings' }} onNavigate={onNavigate} /></div>
    </aside>
  )
}
