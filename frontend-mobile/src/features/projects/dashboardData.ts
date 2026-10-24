import type { Project, ProjectPagination } from './types';

// Web loads one page of100, NOT every page. Match its cap, never silently aggregate partial data.
export const DASHBOARD_PAGE_LIMIT = 100;
export function dashboardDatasetComplete(projects: readonly Project[], pagination: ProjectPagination | null) {
  if (!pagination || pagination.page !== 1 || !Number.isInteger(pagination.total) || pagination.total < 0) return false;
  return projects.length === pagination.total && new Set(projects.map(project => project.id)).size === projects.length;
}

export async function loadDashboardDataset(
  loadPage: (input: { page: number; limit: number }, signal: AbortSignal) => Promise<{ projects: readonly Project[]; pagination: ProjectPagination }>,
  signal: AbortSignal,
) {
  const response = await loadPage({ page: 1, limit: DASHBOARD_PAGE_LIMIT }, signal);
  if (signal.aborted) throw new Error('DASHBOARD_READ_CANCELLED');
  if (!Array.isArray(response.projects) || response.projects.length > DASHBOARD_PAGE_LIMIT) throw new Error('DASHBOARD_INVALID_PAGE');
  return { ...response, complete: dashboardDatasetComplete(response.projects, response.pagination ?? null) };
}
