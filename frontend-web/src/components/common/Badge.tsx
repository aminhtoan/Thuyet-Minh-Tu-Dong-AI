import type { HTMLAttributes, ReactNode } from 'react'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error'
  children: ReactNode
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return <span className={`badge badge--${variant} ${className}`.trim()} {...props}>{children}</span>
}
