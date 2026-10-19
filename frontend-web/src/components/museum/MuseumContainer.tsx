import type { HTMLAttributes, ReactNode } from 'react'

type MuseumContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'readable' | 'content' | 'wide'
  children: ReactNode
}

export function MuseumContainer({ size = 'content', className = '', children, ...props }: MuseumContainerProps) {
  const sizeClass = size === 'content' ? '' : ` museum-container--${size}`
  return <div className={`museum-container${sizeClass} ${className}`.trim()} {...props}>{children}</div>
}
