import type { ReactNode } from 'react'
import { Icon } from '../common/Icon'

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <section className="auth-layout__brand" aria-label="Giới thiệu sản phẩm">
        <div className="auth-layout__brand-content">
          <div className="auth-layout__logo"><span><Icon name="sparkles" width="24" /></span>Người kể chuyện AI</div>
          <div className="auth-layout__pitch">
            <p className="auth-layout__eyebrow">Thuyết minh đa ngôn ngữ</p>
            <h1>Đưa mọi câu chuyện đến với khán giả bằng nhiều ngôn ngữ.</h1>
            <p>Chuẩn bị nội dung video và âm thanh theo quy trình thuyết minh đa ngôn ngữ liền mạch.</p>
          </div>
          <div className="auth-layout__visual" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        </div>
      </section>
      <section className="auth-layout__form-panel">
        <div className="auth-layout__mobile-brand"><span>AI</span>Người kể chuyện AI</div>
        <div className="auth-layout__form-card">
          <header className="auth-layout__heading"><h1>{title}</h1><p>{description}</p></header>
          {children}
          <footer className="auth-layout__footer">{footer}</footer>
        </div>
      </section>
    </main>
  )
}
