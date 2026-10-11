import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'

export function NotFoundPage() {
  return <main className="not-found-page"><Card padding="lg"><div className="state"><span className="state__icon" aria-hidden="true">404</span><h1>Không tìm thấy trang</h1><p>Trang bạn yêu cầu không tồn tại.</p><Button onClick={() => window.history.back()}>Quay lại</Button></div></Card></main>
}
