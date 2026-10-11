const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function validateLoginValues(values) {
  const errors = {}; const email = values.email.trim()
  if (!email) errors.email = 'Email là bắt buộc.'; else if (!emailPattern.test(email)) errors.email = 'Vui lòng nhập địa chỉ email hợp lệ.'
  if (!values.password) errors.password = 'Mật khẩu là bắt buộc.'; else if (values.password.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.'; else if (values.password.length > 128) errors.password = 'Mật khẩu không được vượt quá 128 ký tự.'
  return errors
}
export function validateRegisterValues(values) {
  const errors = validateLoginValues(values); const fullName = values.fullName.trim()
  if (!fullName) errors.fullName = 'Họ và tên là bắt buộc.'; else if (fullName.length < 2) errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự.'; else if (fullName.length > 100) errors.fullName = 'Họ và tên không được vượt quá 100 ký tự.'
  if (!errors.password && !/[A-Z]/.test(values.password)) errors.password = 'Mật khẩu phải có ít nhất một chữ hoa.'; else if (!errors.password && !/[a-z]/.test(values.password)) errors.password = 'Mật khẩu phải có ít nhất một chữ thường.'; else if (!errors.password && !/[0-9]/.test(values.password)) errors.password = 'Mật khẩu phải có ít nhất một chữ số.'
  if (!values.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'; else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
  return errors
}
