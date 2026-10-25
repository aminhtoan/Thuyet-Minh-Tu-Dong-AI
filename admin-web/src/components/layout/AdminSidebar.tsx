import { NavLink, Link } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
import { navigation } from './navigation';
import { AdminMuseumMark } from './AdminMuseumMark';
export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return <><Link to="/dashboard" className="brand" onClick={onNavigate}><AdminMuseumMark /><span>Thuyết minh bảo tàng<small>Nền tảng đa ngôn ngữ · Quản trị</small></span></Link>
    <nav aria-label="Điều hướng quản trị">{navigation.map(group => <section className="nav-group" key={group.group}><h2>{group.group}</h2>{group.items.map(item => <NavLink end={!['/users','/projects','/jobs'].includes(item.to)} key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link--active' : '')}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}</section>)}</nav>
    <div className="sidebar-note"><Badge tone="primary">ADMIN</Badge><p>Giám sát hoạt động và cấu hình hệ thống.</p><Link to="/login" onClick={onNavigate}>Màn hình đăng nhập <Icon name="arrow" width="14" /></Link></div>
  </>;
}
