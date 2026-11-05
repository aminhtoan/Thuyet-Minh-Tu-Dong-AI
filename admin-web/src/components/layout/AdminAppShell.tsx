import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { AdminPageContainer } from './AdminPageContainer';
import { navigationTitle } from './navigation';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import '../../styles/admin-shell.css';
export function AdminAppShell() {
  const drawer = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  const title = navigationTitle(pathname);
  return <div className="admin-shell"><a className="skip-link" href="#admin-content">Đến nội dung chính</a><aside className="sidebar desktop-sidebar"><AdminSidebar /></aside>
    <dialog id="admin-drawer" ref={drawer} className="drawer" aria-label="Điều hướng quản trị"><Button variant="ghost" className="drawer-close" aria-label="Đóng điều hướng" onClick={() => drawer.current?.close()}><Icon name="close" /></Button><AdminSidebar onNavigate={() => drawer.current?.close()} /></dialog>
    <div className="shell-body"><AdminTopbar title={title} onMenuOpen={() => drawer.current?.showModal()} /><AdminPageContainer><Outlet /></AdminPageContainer></div>
  </div>;
}
