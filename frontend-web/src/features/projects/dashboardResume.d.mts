import type { Project } from './types'
import type { ProjectAction } from './projectAction'

export type DashboardResumeDestination = {
  path: string
  label: 'Tiếp tục' | 'Xem chi tiết'
  resumed: boolean
  notice: string | null
}

export const DASHBOARD_RESUME_TIMEOUT_MS: number

export function resolveDashboardResume(
  projectId: string | undefined,
  loadProject: (projectId: string, signal: AbortSignal) => Promise<Project>,
  getAction: (project: Project) => ProjectAction,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<DashboardResumeDestination>
