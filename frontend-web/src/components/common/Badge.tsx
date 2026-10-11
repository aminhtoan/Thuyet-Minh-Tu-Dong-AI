import type { HTMLAttributes, ReactNode } from 'react'
import { getDisplayStatus } from '../../utils/displayLabels'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error'
  children: ReactNode
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const label = typeof children === 'string' ? getDisplayStatus(children) : children
  return <span className={`badge badge--${variant} ${className}`.trim()} {...props}>{label}</span>
}
