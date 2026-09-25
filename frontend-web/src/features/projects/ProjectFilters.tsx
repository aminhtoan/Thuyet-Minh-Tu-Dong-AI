import { Input } from '../../components/common/Input'
import type { ProjectStatusFilter } from './types'

const options: { value: ProjectStatusFilter; label: string }[] = [{ value: 'ALL', label: 'All statuses' }, { value: 'DRAFT', label: 'Draft' }, { value: 'PROCESSING', label: 'Processing' }, { value: 'COMPLETED', label: 'Completed' }, { value: 'FAILED', label: 'Failed' }]

type ProjectFiltersProps = { query: string; status: ProjectStatusFilter; onQueryChange: (value: string) => void; onStatusChange: (value: ProjectStatusFilter) => void }

export function ProjectFilters({ query, status, onQueryChange, onStatusChange }: ProjectFiltersProps) {
  return <div className="project-filters"><Input label="Search projects" type="search" placeholder="Search projects..." value={query} onChange={(event) => onQueryChange(event.target.value)} /><label className="project-filter-select"><span>Status</span><select value={status} onChange={(event) => onStatusChange(event.target.value as ProjectStatusFilter)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
}
