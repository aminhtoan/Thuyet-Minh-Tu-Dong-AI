import type { ComponentProps } from 'react'
import { Badge } from '../common/Badge'

type MuseumBadgeProps = ComponentProps<typeof Badge>

export function MuseumBadge({ className = '', ...props }: MuseumBadgeProps) {
  return <Badge className={`museum-badge ${className}`.trim()} {...props} />
}
