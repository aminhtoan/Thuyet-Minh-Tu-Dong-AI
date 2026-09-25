import { Badge } from '../../components/common/Badge'
import type { ProjectStatus } from './types'
import { getProjectStatusLabel, getProjectStatusVariant } from './projectUtils'

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={getProjectStatusVariant(status)}>{getProjectStatusLabel(status)}</Badge>
}
