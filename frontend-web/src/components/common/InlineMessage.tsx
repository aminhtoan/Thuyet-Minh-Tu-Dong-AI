import type { ReactNode } from 'react'

type InlineMessageProps = {
  variant?: 'info' | 'success' | 'error'
  children: ReactNode
}

export function InlineMessage({ variant = 'info', children }: InlineMessageProps) {
  return <div className={`inline-message inline-message--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>{children}</div>
}
