import { useId } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

type ErrorStateProps = {
  title: string
  description: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({ title, description, onRetry, retryLabel = 'Thử lại' }: ErrorStateProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <section className="state state--error" aria-labelledby={titleId} aria-describedby={descriptionId} role="alert">
      <span className="state__icon" aria-hidden="true"><Icon name="alert" /></span>
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>{retryLabel}</Button>}
    </section>
  )
}
