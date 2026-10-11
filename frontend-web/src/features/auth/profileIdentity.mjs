export function getProfileIdentity(user) {
  const email = user?.email?.trim() ?? ''
  const name = user?.fullName?.trim() || email || 'Tài khoản'
  const initial = Array.from(name)[0]?.toLocaleUpperCase('vi-VN') ?? 'T'
  return { name, email, initial }
}
