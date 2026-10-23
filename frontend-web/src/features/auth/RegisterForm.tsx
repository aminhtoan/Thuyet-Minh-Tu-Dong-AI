import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { InlineMessage } from '../../components/common/InlineMessage'
import { Input } from '../../components/common/Input'
import { authService } from './authService'
import { PasswordField } from './PasswordField'
import type { FormErrors, RegisterFormValues } from './types'
import { validateRegister } from './validation'
import { getRegisterErrorMessage } from './loginError.mjs'

const initialValues: RegisterFormValues = { fullName: '', email: '', password: '', confirmPassword: '' }

export function RegisterForm() {
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FormErrors<RegisterFormValues>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submitLock = useRef(false)

  function updateField(field: keyof RegisterFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, ...(field === 'password' ? { confirmPassword: undefined } : {}) }))
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitLock.current) return
    const nextValues = { ...values, fullName: values.fullName.trim(), email: values.email.trim() }
    const nextErrors = validateRegister(nextValues)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const form = event.currentTarget
      const first = (['fullName', 'email', 'password', 'confirmPassword'] as const).find(field => nextErrors[field])
      requestAnimationFrame(() => { if (form.isConnected) form.querySelector<HTMLInputElement>(`input[name="${first}"]`)?.focus() })
      return
    }

    submitLock.current = true
    setSubmitting(true)
    setFormError('')
    try {
      await authService.register(nextValues)
      navigate('/login', { replace: true, state: { message: 'Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.' } })
    } catch (error) {
      setFormError(getRegisterErrorMessage(error))
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      {formError && <InlineMessage variant="error">{formError}</InlineMessage>}
      <Input name="fullName" label="Họ và tên" autoComplete="name" placeholder="Nhập họ và tên" value={values.fullName} error={errors.fullName} onChange={(event) => updateField('fullName', event.target.value)} required />
      <Input name="email" label="Email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={values.email} error={errors.email} onChange={(event) => updateField('email', event.target.value)} required />
      <PasswordField name="password" label="Mật khẩu" autoComplete="new-password" placeholder="Tạo mật khẩu" helperText="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số." value={values.password} error={errors.password} onChange={(event) => updateField('password', event.target.value)} required />
      <PasswordField name="confirmPassword" label="Xác nhận mật khẩu" autoComplete="new-password" placeholder="Nhập lại mật khẩu" value={values.confirmPassword} error={errors.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} required />
      <Button className="auth-form__submit" type="submit" loading={submitting}>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</Button>
    </form>
  )
}
