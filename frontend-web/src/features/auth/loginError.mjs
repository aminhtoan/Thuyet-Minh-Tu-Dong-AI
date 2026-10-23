export function getLoginErrorMessage(error) {
  const status = typeof error === 'object' && error !== null && typeof error.status === 'number' ? error.status : undefined;
  const code = typeof error === 'object' && error !== null && typeof error.code === 'string' ? error.code : undefined;
  const name = typeof error === 'object' && error !== null && typeof error.name === 'string' ? error.name : undefined;
  const message = error instanceof Error ? error.message : undefined;
  if (status === 401 || code === 'INVALID_CREDENTIALS') return 'Email hoặc mật khẩu không đúng.';
  if (status === 400 || code === 'VALIDATION_ERROR') return 'Dữ liệu đăng nhập không hợp lệ. Vui lòng kiểm tra lại.';
  if (status !== undefined && status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  if (error instanceof TypeError || name === 'TimeoutError') return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  if (message === 'CUSTOMER_REQUIRED') return 'Tài khoản này không thể truy cập khu vực khách hàng.';
  return 'Không thể đăng nhập. Vui lòng thử lại.';
}

export function getRegisterErrorMessage(error) {
  const status = typeof error?.status === 'number' ? error.status : undefined;
  const code = typeof error?.code === 'string' ? error.code : undefined;
  if (code === 'EMAIL_ALREADY_EXISTS') return 'Email đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.';
  if (status === 400 || code === 'VALIDATION_ERROR') return 'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại các trường.';
  if (status === 429) return 'Có quá nhiều yêu cầu. Vui lòng thử lại sau.';
  if (status !== undefined && status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  if (error instanceof TypeError || error?.name === 'TimeoutError') return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  return 'Không thể tạo tài khoản. Vui lòng thử lại.';
}
