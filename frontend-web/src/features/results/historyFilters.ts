import type { Project, ProjectStatusFilter } from '../projects/types'
export type HistoryFilters = { query: string; status: ProjectStatusFilter; period: string; from: string; to: string }
export const defaultHistoryFilters: HistoryFilters = { query: '', status: 'ALL', period: 'ALL', from: '', to: '' }
export function historyDateError(filters: HistoryFilters) {
  if (filters.period !== 'CUSTOM') return ''
  if (!filters.from || !filters.to) return 'Vui lòng chọn ngày bắt đầu và ngày kết thúc.'
  return filters.from > filters.to ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : ''
}
export function filterHistory(projects: readonly Project[], filters: HistoryFilters, now = new Date()) {
  let start: Date | undefined, end: Date | undefined
  if (filters.period !== 'ALL') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    if (filters.period === 'WEEK') start.setDate(start.getDate() - 6)
    if (filters.period === 'MONTH') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 1) }
    if (filters.period === 'YEAR') { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear() + 1, 0, 1) }
    if (filters.period === 'CUSTOM') {
      const [fy, fm, fd] = filters.from.split('-').map(Number), [ty, tm, td] = filters.to.split('-').map(Number)
      start = new Date(fy, fm - 1, fd); end = new Date(ty, tm - 1, td + 1)
    }
  }
  const query = filters.query.trim().toLocaleLowerCase('vi')
  return projects.filter(project => project.name.toLocaleLowerCase('vi').includes(query) && (filters.status === 'ALL' || project.status === filters.status) && (!start || (project.createdAt && Date.parse(project.createdAt) >= start.getTime() && Date.parse(project.createdAt) < end!.getTime())))
}
