import { useId, type HTMLAttributes, type ReactNode } from 'react'

type MuseumSectionHeadingProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  level?: 'h1' | 'h2' | 'h3'
}

export function MuseumSectionHeading({
  title,
  description,
  eyebrow,
  actions,
  level = 'h2',
  className = '',
  ...props
}: MuseumSectionHeadingProps) {
  const titleId = useId()
  const descriptionId = useId()
  const Heading = level

  return (
    <header
      className={`museum-section-heading ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      {...props}
    >
      <div className="museum-section-heading__copy">
        {eyebrow && <span className="museum-section-heading__eyebrow">{eyebrow}</span>}
        <Heading id={titleId} className="museum-section-heading__title">{title}</Heading>
        {description && <p id={descriptionId} className="museum-section-heading__description">{description}</p>}
      </div>
      {actions && <div className="museum-section-heading__actions">{actions}</div>}
    </header>
  )
}
