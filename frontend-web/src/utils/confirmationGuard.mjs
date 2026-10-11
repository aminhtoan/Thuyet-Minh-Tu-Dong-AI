export function requireConfirmation(confirm, message) {
  if (!confirm(message)) throw new DOMException('Đã hủy', 'AbortError')
}
