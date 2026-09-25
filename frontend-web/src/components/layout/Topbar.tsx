import { Icon } from '../common/Icon'

type TopbarProps = { title: string; onMenuClick: () => void; sidebarOpen: boolean }

export function Topbar({ title, onMenuClick, sidebarOpen }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__context"><button className="topbar__menu" type="button" onClick={onMenuClick} aria-label="Toggle navigation" aria-controls="app-sidebar" aria-expanded={sidebarOpen}><Icon name="menu" width="22" /></button><span className="topbar__title">{title}</span></div>
      <div className="topbar__user" aria-label="User placeholder"><span>User</span><span className="topbar__avatar" aria-hidden="true">U</span></div>
    </header>
  )
}
