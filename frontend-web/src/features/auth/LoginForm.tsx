import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { InlineMessage } from '../../components/common/InlineMessage'
import { Input } from '../../components/common/Input'
import { authService } from './authService'
import { PasswordField } from './PasswordField'
import type { FormErrors, LoginFormValues } from './types'
import { validateLogin } from './validation'

const initialValues: LoginFormValues = { email: '', password: '' }

export function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = (location.state as { message?: string } | null)?.message
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FormErrors<LoginFormValues>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(field: keyof LoginFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextValues = { ...values, email: values.email.trim() }
    const nextErrors = validateLogin(nextValues)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await authService.login(nextValues)
      navigate('/dashboard')
    } catch {
      setFormError('Unable to sign in. Please check your credentials and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {successMessage && <InlineMessage variant="success">{successMessage}</InlineMessage>}
      {formError && <InlineMessage variant="error">{formError}</InlineMessage>}
      <Input label="Email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={values.email} error={errors.email} onChange={(event) => updateField('email', event.target.value)} required />
      <PasswordField label="Password" autoComplete="current-password" placeholder="Enter your password" value={values.password} error={errors.password} onChange={(event) => updateField('password', event.target.value)} required />
      <Button className="auth-form__submit" type="submit" loading={submitting}>{submitting ? 'Signing in...' : 'Sign In'}</Button>
    </form>
  )
}
