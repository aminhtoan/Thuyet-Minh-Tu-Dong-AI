const DAY_MS = 86_400_000

function localDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function buildDailyProjectSeries(projects, today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const counts = new Map()
  for (const project of projects) {
    const key = project.createdAt ? localDateKey(project.createdAt) : null
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end.getTime() - (6 - index) * DAY_MS)
    const key = localDateKey(date)
    return {
      key,
      label: new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date),
      fullLabel: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date),
      value: counts.get(key) ?? 0,
    }
  })
}

export function hasCompleteProjectDataset(projectCount, pagination) {
  return !pagination || pagination.total <= projectCount
}
