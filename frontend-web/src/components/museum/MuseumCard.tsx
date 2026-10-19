import type { ComponentProps } from 'react'
import { Card } from '../common/Card'

type MuseumCardProps = ComponentProps<typeof Card> & {
  tone?: 'default' | 'accent' | 'dark'
}

export function MuseumCard({ tone = 'default', className = '', ...props }: MuseumCardProps) {
  const toneClass = tone === 'default' ? '' : ` museum-card--${tone}`
  return <Card className={`museum-card${toneClass} ${className}`.trim()} {...props} />
}
