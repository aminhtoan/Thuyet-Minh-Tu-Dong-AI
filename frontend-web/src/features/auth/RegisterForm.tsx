import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { InlineMessage } from '../../components/common/InlineMessage'
import { Input } from '../../components/common/Input'
import { authService } from './authService'
import { PasswordField } from './PasswordField'
import type { FormErrors, RegisterFormValues } from './types'
import { validateRegister } from './validation'

const initialValues: RegisterFormValues = { fullName: '', email: '', password: '', confirmPassword: '' }

export function RegisterForm() {
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FormErrors<RegisterFormValues>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(field: keyof RegisterFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, ...(field === 'password' ? { confirmPassword: undefined } : {}) }))
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextValues = { ...values, fullName: values.fullName.trim(), email: values.email.trim() }
    const nextErrors = validateRegister(nextValues)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await authService.register(nextValues)
      navigate('/login', { replace: true, state: { message: 'Account created. You can now sign in.' } })
    } catch {
      setFormError('Unable to create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {formError && <InlineMessage variant="error">{formError}</InlineMessage>}
      <Input label="Full name" autoComplete="name" placeholder="Your full name" value={values.fullName} error={errors.fullName} onChange={(event) => updateField('fullName', event.target.value)} required />
      <Input label="Email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={values.email} error={errors.email} onChange={(event) => updateField('email', event.target.value)} required />
      <PasswordField label="Password" autoComplete="new-password" placeholder="Create a password" helperText="Password must contain at least 8 characters." value={values.password} error={errors.password} onChange={(event) => updateField('password', event.target.value)} required />
      <PasswordField label="Confirm password" autoComplete="new-password" placeholder="Repeat your password" value={values.confirmPassword} error={errors.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} required />
      <Button className="auth-form__submit" type="submit" loading={submitting}>{submitting ? 'Creating account...' : 'Create Account'}</Button>
    </form>
  )
}
