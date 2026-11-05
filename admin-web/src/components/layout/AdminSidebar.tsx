import { useId, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
import { navigation, navigationMatches, type NavigationItem, type NavigationLink } from './navigation';
import { Button } from '../common/Button';
import { AdminMuseumMark } from './AdminMuseumMark';
export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return <><Link to="/dashboard" className="brand" onClick={onNavigate}><AdminMuseumMark /><span>Thuyết minh bảo tàng<small>Nền tảng đa ngôn ngữ · Quản trị</small></span></Link>
    <nav aria-label="Điều hướng quản trị">{navigation.map(group => <section className="nav-group" key={group.group}><h2>{group.group}</h2>{group.items.map(item => 'children' in item
      ? <NavigationDisclosure key={item.id + pathname} item={item} onNavigate={onNavigate} />
      : <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />)}</section>)}</nav>
    <div className="sidebar-note"><Badge tone="primary">ADMIN</Badge><p>Giám sát hoạt động và cấu hình hệ thống.</p><Link to="/login" onClick={onNavigate}>Màn hình đăng nhập <Icon name="arrow" width="14" /></Link></div>
  </>;
}

function SidebarLink({ item, onNavigate }: { item: NavigationLink; onNavigate?: () => void }) {
  return <NavLink end={!['/users', '/projects', '/jobs'].includes(item.to)} to={item.to} onClick={onNavigate} className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link--active' : '')}><Icon name={item.icon} /><span>{item.label}</span></NavLink>;
}

function NavigationDisclosure({ item, onNavigate }: { item: Extract<NavigationItem, { children: NavigationLink[] }>; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const active = item.children.some(link => navigationMatches(link, pathname));
  // Keyed by pathname: entering either child always opens the group again.
  const [open, setOpen] = useState(active);
  const panelId = useId();
  return <div className="nav-disclosure">
    <Button variant="ghost" className={'nav-link nav-disclosure__toggle' + (active ? ' nav-disclosure__toggle--active' : '')}
      aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
      <Icon name={item.icon} /><span>{item.label}</span><Icon name="chevronDown" className="nav-disclosure__chevron" />
    </Button>
    <div id={panelId} className="nav-submenu" hidden={!open}>
      {item.children.map(link => <SidebarLink key={link.to} item={link} onNavigate={onNavigate} />)}
    </div>
  </div>;
}
