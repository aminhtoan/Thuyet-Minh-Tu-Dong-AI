import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  children: ReactNode
}

export function Card({ padding = 'md', interactive = false, className = '', children, ...props }: CardProps) {
  return (
    <div className={`card card--${padding}${interactive ? ' card--interactive' : ''} ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
