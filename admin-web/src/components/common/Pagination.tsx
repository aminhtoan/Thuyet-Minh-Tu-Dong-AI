import { Button } from './Button';

import { paginationItems } from '../../utils/pagination';

type PageInfo = { page: number; totalPages: number; total: number; limit: number };
export function Pagination({ value, onPage, label = 'Phân trang', displayedCount, disabled = false }: {
  value: PageInfo; onPage: (page: number) => void; label?: string; displayedCount?: number; disabled?: boolean;
}) {
  const count = displayedCount ?? Math.max(0, Math.min(value.limit, value.total - (value.page - 1) * value.limit));
  return <nav className="pagination admin-pagination" aria-label={label}>
    <span>Hiển thị {count} / {value.total} kết quả</span>
    <div><Button variant="secondary" disabled={disabled || value.page <= 1 || value.totalPages === 0} onClick={() => onPage(value.page - 1)}>Trước</Button>
      {paginationItems(value.page, value.totalPages).map(item => typeof item === 'number'
        ? <Button key={item} variant={value.page === item ? 'primary' : 'secondary'} aria-label={`Trang ${item}`} aria-current={value.page === item ? 'page' : undefined} disabled={disabled} onClick={() => onPage(item)}>{item}</Button>
        : <span key={item} className="pagination-gap" aria-hidden="true">…</span>)}
      <Button variant="secondary" disabled={disabled || value.page >= value.totalPages} onClick={() => onPage(value.page + 1)}>Sau</Button></div>
  </nav>;
}
