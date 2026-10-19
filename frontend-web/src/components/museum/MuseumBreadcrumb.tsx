import { Link } from 'react-router-dom'

export function MuseumBreadcrumb({ current, detail = false }: { current: string; detail?: boolean }) {
  return <nav className="museum-explore__breadcrumb" aria-label="Đường dẫn trang">
    <ol><li><Link to="/">Trang chủ</Link></li>{detail && <li><Link to="/kham-pha">Khám phá</Link></li>}<li aria-current="page">{current}</li></ol>
  </nav>
}
