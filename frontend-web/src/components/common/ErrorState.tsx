import { Button } from './Button'

type ErrorStateProps = {
  title: string
  description: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({ title, description, onRetry, retryLabel = 'Try again' }: ErrorStateProps) {
  return (
    <section className="state state--error" aria-labelledby="error-state-title" role="alert">
      <span className="state__icon" aria-hidden="true">!</span>
      <h2 id="error-state-title">{title}</h2>
      <p>{description}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>{retryLabel}</Button>}
    </section>
  )
}
