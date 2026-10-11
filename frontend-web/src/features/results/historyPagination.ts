export function historyPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  if (current <= 3) { pages.add(2); pages.add(3); pages.add(4) }
  if (current >= total - 2) { pages.add(total - 1); pages.add(total - 2); pages.add(total - 3) }
  const selected = [...pages].filter(page => page >= 1 && page <= total).sort((a, b) => a - b)
  const result: (number | '…')[] = []
  for (const page of selected) {
    const previous = result[result.length - 1]
    if (typeof previous === 'number' && page - previous > 1) result.push('…')
    result.push(page)
  }
  return result
}
