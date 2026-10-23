import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../features/auth/authService';
import { subscribeProfileUpdates } from '../../features/auth/profileUpdate.mjs';
import { getProfileIdentity } from '../../features/auth/profileIdentity.mjs';
import { confirmationMessages } from '../../localization/confirmationMessages.mjs';
import { Icon } from '../common/Icon';
import { MuseumBrandIcon } from './MuseumBrandIcon';

type TopbarProps = { menuButtonRef: RefObject<HTMLButtonElement | null>; title: string; onMenuClick: () => void; sidebarOpen: boolean };
type HeaderUser = { id: string; fullName: string; email: string; role: string };

export function Topbar({ menuButtonRef, title, onMenuClick, sidebarOpen }: TopbarProps) {
  const [query, setQuery] = useState('');
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const profileId = useId();
  const profileRootRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const logoutLock = useRef(false);
  const identity = getProfileIdentity(user);
  const isProjectsPage = pathname === '/projects';
  const isNewProjectPage = pathname === '/projects/new';
  const isHistoryPage = pathname === '/history';
  const isAccountPage = pathname === '/settings';
  const showSearch = !isProjectsPage && !isNewProjectPage && !isHistoryPage && !isAccountPage;

  useEffect(() => {
    let active = true;
    let updated = false;
    const unsubscribe = subscribeProfileUpdates((currentUser) => { updated = true; if (active) setUser(currentUser); });
    void authService.me().then(({ user: currentUser }) => { if (active && !updated) setUser(currentUser); }).catch(() => { /* The account page retains retry/error details. */ });
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    function closeOnPointerDown(event: PointerEvent) { if (!profileRootRef.current?.contains(event.target as Node)) setProfileOpen(false); }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') { setProfileOpen(false); profileButtonRef.current?.focus(); } }
    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOnPointerDown); document.removeEventListener('keydown', closeOnEscape); };
  }, [profileOpen]);

  function openProfile() {
    setProfileOpen(true);
    requestAnimationFrame(() => profileRootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')];
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? (current + 1) % items.length : event.key === 'ArrowUp' ? (current - 1 + items.length) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); items[next]?.focus(); }
  }

  async function logout() {
    if (logoutLock.current || logoutError || !window.confirm(confirmationMessages.logout)) return;
    logoutLock.current = true;
    setLoggingOut(true);
    try { await authService.logout(); navigate('/login', { replace: true }); }
    catch { setLoggingOut(false); logoutLock.current = false; setLogoutError(true); }
  }

  return <header className={`topbar${showSearch ? ' topbar--search' : ''}${isProjectsPage ? ' topbar--projects' : ''}${isNewProjectPage ? ' topbar--create' : ''}${isHistoryPage ? ' topbar--history' : ''}${isAccountPage ? ' topbar--account' : ''}`}>
    <div className="topbar__context">
      {pathname === '/dashboard' && <span className="topbar__brand"><MuseumBrandIcon /><span>Thuyết minh bảo tàng</span></span>}
      <button ref={menuButtonRef} className="topbar__menu" type="button" onClick={onMenuClick} aria-label={sidebarOpen ? 'Đóng điều hướng' : 'Mở điều hướng'} aria-controls="app-sidebar" aria-expanded={sidebarOpen}><Icon name="menu" width="22" /></button>
      {isProjectsPage ? <div className="topbar__page-heading"><h1>Dự án của tôi</h1><p>Tìm kiếm, theo dõi và tiếp tục hành trình thuyết minh của bạn.</p></div> : isNewProjectPage ? <div className="topbar__create-heading"><h1>Tạo dự án mới</h1><p>Thêm thông tin và phương tiện để bắt đầu tạo thuyết minh.</p></div> : isHistoryPage ? <div className="topbar__history-heading"><h1>Lịch sử</h1><p>Theo dõi các dự án và mở lại kết quả đã tạo.</p></div> : isAccountPage ? <div className="topbar__account-heading"><h1>Tài khoản</h1><p>Quản lý thông tin cá nhân của bạn.</p></div> : <span className="topbar__title" title={title}>{title}</span>}
    </div>
    <div className="topbar__center">
      {showSearch && <form className="topbar__search" role="search" onSubmit={event => { event.preventDefault(); navigate('/projects?q=' + encodeURIComponent(query.trim())); }}>
        <Icon name="search" width="18" /><input aria-label="Tìm kiếm dự án toàn ứng dụng" placeholder="Tìm kiếm dự án..." value={query} onChange={event => setQuery(event.target.value)} />
        <button type="submit" aria-label="Tìm dự án"><Icon name="arrow" width="16" /></button>
      </form>}
      {isNewProjectPage && <Link className="button button--secondary button--md topbar__create-back" to="/projects"><Icon name="arrow" width="16" />Về danh sách dự án</Link>}
    </div>
    <div className="topbar__account-region"><div className="topbar-profile" ref={profileRootRef}>
      <button ref={profileButtonRef} className="topbar-profile__trigger" type="button" aria-label={`Mở menu tài khoản của ${identity.name}`} aria-haspopup="menu" aria-expanded={profileOpen} aria-controls={profileId} onClick={() => profileOpen ? setProfileOpen(false) : openProfile()} onKeyDown={(event) => { if (!profileOpen && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openProfile(); } }}>
        <span className="topbar-profile__avatar" aria-hidden="true">{identity.initial}</span><span className="topbar-profile__copy"><strong title={identity.name}>{identity.name}</strong><small>Người dùng</small></span><Icon className={`topbar-profile__chevron${profileOpen ? ' topbar-profile__chevron--open' : ''}`} name="chevronDown" width="16" />
      </button>
      {profileOpen && <div id={profileId} className="topbar-profile__menu" role="menu" aria-label="Menu tài khoản" onKeyDown={handleMenuKeyDown}>
        <div className="topbar-profile__summary"><span className="topbar-profile__avatar" aria-hidden="true">{identity.initial}</span><span><strong title={identity.name}>{identity.name}</strong>{identity.email && <small title={identity.email}>{identity.email}</small>}</span></div>
        <div className="topbar-profile__divider" />
        <Link className="topbar-profile__item" role="menuitem" to="/settings" onClick={() => setProfileOpen(false)}>Thông tin tài khoản</Link>
        <button className="topbar-profile__item topbar-profile__item--danger" role="menuitem" type="button" disabled={loggingOut || logoutError} onClick={() => void logout()}>{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</button>
      </div>}
    </div></div>
    {logoutError && <p className="topbar__logout-error" role="alert">Chưa xác nhận được việc đăng xuất trên máy chủ. Vui lòng đăng nhập lại để tiếp tục.{' '}<Link to="/login">Đến trang đăng nhập</Link></p>}
  </header>;
}
