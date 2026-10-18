import { useId } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <section className="state" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <span className="state__icon" aria-hidden="true"><Icon name="document" /></span>
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      {action}
    </section>
  )
}
