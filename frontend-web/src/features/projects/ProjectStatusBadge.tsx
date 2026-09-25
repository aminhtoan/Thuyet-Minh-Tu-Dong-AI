import { Badge } from '../../components/common/Badge'
import type { ProjectStatus } from './types'
import { getProjectStatusLabel, getProjectStatusVariant } from './projectUtils'

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={getProjectStatusVariant(status)}>{{ Completed: 'Hoàn thành', Processing: 'Đang xử lý', Draft: 'Bản nháp', Failed: 'Thất bại' }[getProjectStatusLabel(status)]}</Badge>
}
