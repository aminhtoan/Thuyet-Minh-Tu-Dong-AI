import { useId } from 'react'
import type { ReactNode } from 'react'

type PageHeaderProps = { title: string; description?: string; actions?: ReactNode }

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <header
      className="page-header"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="page-header__copy">
        <h1 id={titleId}>{title}</h1>
        {description && <p id={descriptionId}>{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}
