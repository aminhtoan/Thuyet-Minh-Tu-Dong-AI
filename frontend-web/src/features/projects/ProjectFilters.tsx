import { Input } from '../../components/common/Input'
import { projectStatusLabels } from '../../localization/statusLabels.mjs'
import type { ProjectStatusFilter } from './types'

const options: { value: ProjectStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  ...Object.entries(projectStatusLabels).map(([value, label]) => ({ value: value as ProjectStatusFilter, label })),
]

type ProjectFiltersProps = { query: string; status: ProjectStatusFilter; onQueryChange: (value: string) => void; onStatusChange: (value: ProjectStatusFilter) => void }

export function ProjectFilters({ query, status, onQueryChange, onStatusChange }: ProjectFiltersProps) {
  return <div className="project-filters"><Input label="Tìm kiếm dự án" type="search" placeholder="Tìm kiếm dự án..." value={query} onChange={(event) => onQueryChange(event.target.value)} /><label className="project-filter-select"><span>Trạng thái</span><select value={status} onChange={(event) => onStatusChange(event.target.value as ProjectStatusFilter)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
}
