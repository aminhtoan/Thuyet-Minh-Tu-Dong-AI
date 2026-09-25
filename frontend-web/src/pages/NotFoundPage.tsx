import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'

export function NotFoundPage() {
  return <main className="not-found-page"><Card padding="lg"><div className="state"><span className="state__icon" aria-hidden="true">404</span><h1>Page not found</h1><p>The page you requested does not exist.</p><Button onClick={() => window.history.back()}>Go back</Button></div></Card></main>
}
