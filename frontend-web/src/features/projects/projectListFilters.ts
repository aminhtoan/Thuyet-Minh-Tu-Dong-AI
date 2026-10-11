import type { Project } from './types'
import { filterHistory, type HistoryFilters } from '../results/historyFilters.ts'
export type ProjectListFilters = HistoryFilters & { sort: string }
const normalize = (value: string) => value.trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
export function filterAndSortProjects(projects: readonly Project[], filters: ProjectListFilters, now = new Date()) {
  const items = filterHistory(projects, { ...filters, query: '' }, now).filter(project => normalize(project.name).includes(normalize(filters.query)))
  const compare = new Intl.Collator('vi', { sensitivity: 'base', numeric: true }).compare
  return items.sort((a, b) => { const delta = filters.sort.startsWith('NAME') ? compare(a.name, b.name) : (Date.parse(a.createdAt ?? '') || 0) - (Date.parse(b.createdAt ?? '') || 0); return (filters.sort === 'OLDEST' || filters.sort === 'NAME_ASC' ? delta : -delta) || a.id.localeCompare(b.id) })
}
