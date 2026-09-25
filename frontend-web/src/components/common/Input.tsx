import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  helperText?: string
  error?: string
  prefix?: ReactNode
  suffix?: ReactNode
}

export function Input({
  id,
  label,
  helperText,
  error,
  prefix,
  suffix,
  required,
  disabled,
  className = '',
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label} {required && <span className="field__required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className={`field__control${error ? ' field__control--error' : ''}${disabled ? ' field__control--disabled' : ''}`}>
        {prefix && <span className="field__addon">{prefix}</span>}
        <input
          id={inputId}
          className="field__input"
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error || helperText ? messageId : undefined}
          {...props}
        />
        {suffix && <span className="field__addon">{suffix}</span>}
      </div>
      {(error || helperText) && (
        <p id={messageId} className={`field__message${error ? ' field__message--error' : ''}`}>
          {error ?? helperText}
        </p>
      )}
    </div>
  )
}
