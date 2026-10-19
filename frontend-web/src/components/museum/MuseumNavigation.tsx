import { NavLink } from 'react-router-dom'

const museumNavigation = [
  { to: '/', label: 'Trang chủ' },
  { to: '/kham-pha', label: 'Khám phá' },
  { to: '/thuyet-minh', label: 'Thuyết minh' },
  { to: '/ve-bao-tang', label: 'Về bảo tàng' },
]

export function MuseumNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return <nav aria-label="Điều hướng bảo tàng" className="museum-navigation">
    {museumNavigation.map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate}>{label}</NavLink>)}
  </nav>
}
