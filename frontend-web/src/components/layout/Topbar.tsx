import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../common/Icon';
type TopbarProps = { title: string; onMenuClick: () => void; sidebarOpen: boolean };
export function Topbar({ title, onMenuClick, sidebarOpen }: TopbarProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  return <header className="topbar">
    <div className="topbar__context"><button className="topbar__menu" type="button" onClick={onMenuClick} aria-label="Toggle navigation" aria-controls="app-sidebar" aria-expanded={sidebarOpen}><Icon name="menu" width="22" /></button><span className="topbar__title">{title}</span></div>
    <form className="topbar__search" role="search" onSubmit={event => { event.preventDefault(); navigate('/projects?q=' + encodeURIComponent(query.trim())); }}>
      <Icon name="search" width="17" /><input aria-label="Tìm kiếm dự án toàn ứng dụng" placeholder="Tìm kiếm dự án..." value={query} onChange={event => setQuery(event.target.value)} />
      <button type="submit" aria-label="Tìm dự án"><Icon name="arrow" width="16" /></button>
    </form>
    <button className="topbar__user" type="button" aria-label="Mở cài đặt tài khoản" onClick={() => navigate('/settings')}><span className="topbar__avatar" aria-hidden="true">U</span><span>Tài khoản</span></button>
  </header>;
}
