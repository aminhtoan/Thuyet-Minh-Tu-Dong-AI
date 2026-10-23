import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Spinner } from '../components/common/Spinner'
import { Icon } from '../components/common/Icon'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import { languageNames } from '../features/projects/projectUtils'
import { useCompleteHistory } from '../features/results/useCompleteHistory'
import { libraryProduct, filterLibrary } from '../features/results/libraryPresentation'
import '../styles/narration-library.css'

const defaults = { query: '', media: 'ALL', language: 'ALL' }
export function HistoryPlaceholder() {
  const { projects, isLoading, error, reload } = useCompleteHistory()
  const [draft, setDraft] = useState(defaults), [applied, setApplied] = useState(defaults), [page, setPage] = useState(1)
  const products = useMemo(() => projects.flatMap(project => { const item = libraryProduct(project); return item ? [item] : [] }), [projects])
  const languages = [...new Set(products.map(item => item.language))].sort()
  const matches = useMemo(() => filterLibrary(products, applied), [products, applied])
  const totalPages = Math.max(1, Math.ceil(matches.length / 12)), currentPage = Math.min(page, totalPages)
  const visible = matches.slice((currentPage - 1) * 12, currentPage * 12)
  const unverified = projects.some(project => project.status === 'COMPLETED' && !libraryProduct(project))
  return <div className="narration-library">
    <Card className="narration-library__toolbar"><form onSubmit={event => { event.preventDefault(); setApplied({ ...draft }); setPage(1) }}>
      <Input label="Tìm kiếm sản phẩm" type="search" placeholder="Nhập tên dự án..." value={draft.query} onChange={event => setDraft({ ...draft, query: event.target.value })} />
      <label>Loại phương tiện<select value={draft.media} onChange={event => setDraft({ ...draft, media: event.target.value })}><option value="ALL">Tất cả phương tiện</option><option value="VIDEO">Video</option><option value="AUDIO">Âm thanh</option></select></label>
      {languages.length > 0 && <label>Ngôn ngữ thuyết minh<select value={draft.language} onChange={event => setDraft({ ...draft, language: event.target.value })}><option value="ALL">Tất cả ngôn ngữ</option>{languages.map(code => <option key={code} value={code}>{languageNames[code] ?? code}</option>)}</select></label>}
      <Button type="submit" disabled={isLoading}><Icon name="search" width="18" />Tìm kiếm</Button>
    </form></Card>
    {isLoading ? <Card><div className="narration-library__state" role="status"><Spinner label="Đang tải thư viện thuyết minh" /><p>Đang tải thư viện thuyết minh...</p></div></Card>
      : error ? <Card><ErrorState title="Không thể tải thư viện thuyết minh" description={error} onRetry={reload} /></Card> : <>
        {unverified && <p className="narration-library__notice" role="status"><strong>Dữ liệu chưa đầy đủ.</strong> Một số dự án chưa có đủ xác nhận tệp kết quả và ngôn ngữ từ máy chủ nên chưa được hiển thị trong thư viện.</p>}
        {visible.length ? <div className="narration-library__grid">{visible.map(item => <article className="narration-library__product" key={item.project.id}>
          <div className="narration-library__visual" aria-hidden="true"><Icon name={item.mediaType === 'VIDEO' ? 'video' : 'wave'} width="48" height="48" /></div>
          <div className="narration-library__body"><h2>{item.project.name}</h2><dl><div><dt>Phương tiện</dt><dd>{item.mediaType === 'VIDEO' ? 'Video' : 'Âm thanh'}</dd></div><div><dt>Ngôn ngữ thuyết minh</dt><dd>{languageNames[item.language] ?? item.language}</dd></div></dl>
            <Link className="button button--primary button--md" to={item.path} aria-label={`Xem thuyết minh ${item.project.name}`}>Xem thuyết minh<Icon name="arrow" width="16" /></Link>
          </div>
        </article>)}</div> : <Card className="narration-library__empty"><EmptyState title={products.length ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm thuyết minh.'} description={products.length ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc.' : 'Tạo thuyết minh để bắt đầu một dự án mới.'} action={!products.length ? <Link className="button button--primary button--md" to="/projects/new">Tạo thuyết minh</Link> : undefined} /></Card>}
        {matches.length > 12 && <nav className="narration-library__pagination" aria-label="Phân trang thư viện"><Button variant="secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trang trước</Button><span role="status">Trang {currentPage} / {totalPages}</span><Button variant="secondary" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Trang sau</Button></nav>}
      </>}
  </div>
}
