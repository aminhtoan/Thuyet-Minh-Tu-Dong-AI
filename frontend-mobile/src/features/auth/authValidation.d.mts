import type { FormErrors, LoginFormValues, RegisterFormValues } from './types'
export function validateLoginValues(values: LoginFormValues): FormErrors<LoginFormValues>
export function validateRegisterValues(values: RegisterFormValues): FormErrors<RegisterFormValues>
