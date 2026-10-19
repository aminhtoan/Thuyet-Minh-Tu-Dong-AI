import type { ComponentProps } from 'react'
import { Button } from '../common/Button'

type MuseumButtonProps = ComponentProps<typeof Button>

export function MuseumButton({ className = '', ...props }: MuseumButtonProps) {
  return <Button className={`museum-button ${className}`.trim()} {...props} />
}
