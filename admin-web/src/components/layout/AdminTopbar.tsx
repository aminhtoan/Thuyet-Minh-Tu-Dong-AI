import { Badge } from '../common/Badge';
import { Icon } from '../common/Icon';
export function AdminTopbar({ title, onMenuOpen }: { title: string; onMenuOpen: () => void }) {
  return <header className="topbar"><button className="menu-button" onClick={onMenuOpen} aria-label="Mở điều hướng" aria-haspopup="dialog" aria-controls="admin-drawer"><Icon name="menu" /></button><div className="breadcrumb"><span>Quản trị</span><span aria-hidden="true">/</span><strong>{title}</strong></div><div className="admin-user"><Badge tone="primary">ADMIN</Badge><span className="avatar" aria-hidden="true">A</span><span>Quản trị viên</span></div></header>;
}
