import type { FormErrors, LoginFormValues, RegisterFormValues } from './types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(values: LoginFormValues): FormErrors<LoginFormValues> {
  const errors: FormErrors<LoginFormValues> = {};
  const email = values.email.trim();
  if (!email) errors.email = 'Email là bắt buộc.';
  else if (!emailPattern.test(email)) errors.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
  if (!values.password) errors.password = 'Mật khẩu là bắt buộc.';
  else if (values.password.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
  return errors;
}

export function validateRegister(values: RegisterFormValues): FormErrors<RegisterFormValues> {
  const errors: FormErrors<RegisterFormValues> = validateLogin(values);
  const fullName = values.fullName.trim();
  if (!fullName) errors.fullName = 'Họ và tên là bắt buộc.';
  else if (fullName.length < 2) errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự.';
  if (!values.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  return errors;
}
