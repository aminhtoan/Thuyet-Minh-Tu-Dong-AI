import { Input } from '../../components/common/Input'
import type { ProjectStatusFilter } from './types'

const options: { value: ProjectStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' }, { value: 'DRAFT', label: 'Bản nháp' }, { value: 'UPLOADED', label: 'Đã tải lên' },
  { value: 'TRANSCRIBING', label: 'Đang tạo bản ghi' }, { value: 'TRANSCRIBED', label: 'Đã tạo bản ghi' },
  { value: 'TRANSLATING', label: 'Đang dịch' }, { value: 'TRANSLATED', label: 'Đã dịch' },
  { value: 'GENERATING_AUDIO', label: 'Đang tạo giọng đọc' }, { value: 'PROCESSING_VIDEO', label: 'Đang xử lý video' },
  { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'FAILED', label: 'Thất bại' },
]

type ProjectFiltersProps = { query: string; status: ProjectStatusFilter; onQueryChange: (value: string) => void; onStatusChange: (value: ProjectStatusFilter) => void }

export function ProjectFilters({ query, status, onQueryChange, onStatusChange }: ProjectFiltersProps) {
  return <div className="project-filters"><Input label="Tìm kiếm dự án" type="search" placeholder="Tìm kiếm dự án..." value={query} onChange={(event) => onQueryChange(event.target.value)} /><label className="project-filter-select"><span>Trạng thái</span><select value={status} onChange={(event) => onStatusChange(event.target.value as ProjectStatusFilter)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
}
