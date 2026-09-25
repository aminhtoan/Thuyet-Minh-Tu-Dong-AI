type ProgressBarProps = {
  value: number
  label?: string
  showValue?: boolean
}

export function ProgressBar({ value, label, showValue = true }: ProgressBarProps) {
  const normalizedValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0

  return (
    <div className="progress">
      {(label || showValue) && (
        <div className="progress__meta">
          <span>{label}</span>
          {showValue && <span>{normalizedValue}%</span>}
        </div>
      )}
      <div className="progress__track" role="progressbar" aria-label={label ?? 'Progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={normalizedValue}>
        <div className="progress__bar" style={{ width: `${normalizedValue}%` }} />
      </div>
    </div>
  )
}
