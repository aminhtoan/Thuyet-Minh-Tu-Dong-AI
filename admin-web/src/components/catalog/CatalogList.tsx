import type { ReactNode } from 'react';
import { Card } from '../common/Card';
import { SearchField } from '../common/FormFields';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../common/Button';
import type { IconName } from '../common/Icon';
import '../../styles/catalog.css';

export function CatalogList({ search, onSearch, label, loading, error, retry, count, total, noun, icon, notice, children, supplementary }: {
  search: string; onSearch: (value: string) => void; label: string; loading: boolean; error: boolean; retry: () => void;
  count: number; total: number; noun: string; icon: IconName; notice: string; children: ReactNode; supplementary?: ReactNode;
}) {
  const filtered = Boolean(search);
  return <Card className="catalog-list-card">
    <div className="catalog-toolbar"><SearchField label={label} value={search} onChange={e => onSearch(e.target.value)} placeholder={`${label}...`} />
      {filtered && <Button variant="ghost" onClick={() => onSearch('')}>Đặt lại</Button>}
    </div>
    {supplementary}
    <div className="catalog-summary" role="status" aria-atomic="true">{loading ? 'Đang tải danh mục…' : error ? 'Chưa tải được kết quả.' : `${count.toLocaleString('vi-VN')}/${total.toLocaleString('vi-VN')} ${noun}${filtered ? ' khớp tìm kiếm' : ''}`}</div>
    <LoadingState loading={loading} label="">
      {loading ? <div className="catalog-placeholder" aria-hidden="true">Đang tải dữ liệu…</div> : error ?
        <ErrorState title={`Không thể tải danh sách ${noun}`} description="Hãy kiểm tra kết nối và thử lại. Từ khóa tìm kiếm được giữ nguyên." onRetry={retry} /> :
        count ? children : <EmptyState icon={icon} title={filtered ? `Không tìm thấy ${noun} phù hợp.` : `Chưa có ${noun}.`}
          description={filtered ? 'Hãy thử từ khóa khác hoặc đặt lại tìm kiếm.' : 'Danh mục chưa có dữ liệu được trả về từ Backend.'}
          action={filtered ? <Button variant="secondary" onClick={() => onSearch('')}>Đặt lại tìm kiếm</Button> : undefined} />}
    </LoadingState>
    <p className="catalog-notice">{notice}</p>
  </Card>;
}
