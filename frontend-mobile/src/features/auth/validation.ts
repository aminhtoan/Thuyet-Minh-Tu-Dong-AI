import type { FormErrors, LoginFormValues, RegisterFormValues } from './types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(values: LoginFormValues): FormErrors<LoginFormValues> {
  const errors: FormErrors<LoginFormValues> = {};
  const email = values.email.trim();
  if (!email) errors.email = 'Email is required.';
  else if (!emailPattern.test(email)) errors.email = 'Please enter a valid email address.';
  if (!values.password) errors.password = 'Password is required.';
  else if (values.password.length < 8) errors.password = 'Password must contain at least 8 characters.';
  return errors;
}

export function validateRegister(values: RegisterFormValues): FormErrors<RegisterFormValues> {
  const errors: FormErrors<RegisterFormValues> = validateLogin(values);
  const fullName = values.fullName.trim();
  if (!fullName) errors.fullName = 'Full name is required.';
  else if (fullName.length < 2) errors.fullName = 'Full name must contain at least 2 characters.';
  if (!values.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}
