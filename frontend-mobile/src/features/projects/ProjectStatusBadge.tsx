import { Badge } from '@/components/common/Badge';
import { typography } from '@/theme/tokens';
import type { ProjectStatus } from './types';
import { getProjectStatusLabel, getProjectStatusVariant } from './projectUtils';

export function ProjectStatusBadge({ status, dashboard = false }: { status: ProjectStatus; dashboard?: boolean }) {
  return <Badge variant={getProjectStatusVariant(status)} style={dashboard ? { maxWidth: '100%', paddingVertical: 4 } : undefined} labelStyle={dashboard ? { fontFamily: typography.family.semibold, lineHeight: 18, flexShrink: 1 } : undefined}>{getProjectStatusLabel(status)}</Badge>;
}
