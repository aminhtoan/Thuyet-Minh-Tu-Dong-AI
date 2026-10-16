function localDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function localMonthKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function normalizeAnchor(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new TypeError('A valid local chart date is required.')
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function countProjects(projects, keyForValue) {
  const counts = new Map()
  for (const project of projects) {
    const key = project.createdAt ? keyForValue(project.createdAt) : null
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function buildProjectTimeSeries(projects, mode, selectedDate = new Date()) {
  const anchor = normalizeAnchor(selectedDate)

  if (mode === 'year') {
    const counts = countProjects(projects, localMonthKey)
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(anchor.getFullYear(), index, 1)
      const key = localMonthKey(date)
      return {
        key,
        label: `Thg ${index + 1}`,
        fullLabel: new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(date),
        value: counts.get(key) ?? 0,
      }
    })
  }

  const counts = countProjects(projects, localDateKey)
  if (mode === 'month') {
    const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth(), index + 1)
      const key = localDateKey(date)
      return {
        key,
        label: String(index + 1),
        fullLabel: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date),
        value: counts.get(key) ?? 0,
      }
    })
  }

  if (mode !== 'day') throw new TypeError(`Unsupported project time range: ${mode}`)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - (6 - index))
    const key = localDateKey(date)
    return {
      key,
      label: new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date),
      fullLabel: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date),
      value: counts.get(key) ?? 0,
    }
  })
}

export function buildDailyProjectSeries(projects, today = new Date()) {
  return buildProjectTimeSeries(projects, 'day', today)
}

export function hasCompleteProjectDataset(projectCount, pagination) {
  return !pagination || pagination.total <= projectCount
}

export function buildLinearProjectScale(maxValue) {
  const value = Number.isFinite(maxValue) ? Math.max(0, Math.ceil(maxValue)) : 0
  const intervalCount = Math.min(4, Math.max(1, value))
  const step = Math.max(1, Math.ceil(value / intervalCount))
  const maximum = step * intervalCount
  return {
    maximum,
    ticks: Array.from({ length: intervalCount + 1 }, (_, index) => maximum - index * step),
  }
}

export function buildProjectStatusDistribution(statistics) {
  const total = Math.max(0, statistics.total)
  const completed = Math.max(0, statistics.completed)
  const processing = Math.max(0, statistics.processing)
  const failed = Math.max(0, statistics.failed)
  const classified = completed + processing + failed
  if (classified > total) throw new RangeError('Project status counts exceed the total project count.')

  const values = [
    { key: 'completed', label: 'Hoàn thành', value: completed },
    { key: 'processing', label: 'Đang xử lý', value: processing },
    { key: 'failed', label: 'Thất bại', value: failed },
    { key: 'other', label: 'Khác', value: total - classified },
  ]

  return values.map((item) => ({
    ...item,
    percentage: total ? Number(((item.value / total) * 100).toFixed(1)) : 0,
  }))
}
