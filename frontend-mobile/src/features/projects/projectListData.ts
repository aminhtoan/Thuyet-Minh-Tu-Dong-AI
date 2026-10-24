import type { Project, ProjectPagination } from './types';

export const PROJECT_LIST_PAGE_LIMIT = 100;
export const PROJECT_LIST_MAX_PAGES = 100;
// Same full-dataset scope as Web useCompleteHistory, bounded and fail-closed.
export async function loadCompleteProjectList(loadPage: (input: { page: number; limit: number }, signal: AbortSignal) => Promise<{ projects: readonly Project[]; pagination: ProjectPagination }>, signal: AbortSignal) {
  const projects: Project[] = [], ids = new Set<string>();
  let total = -1, totalPages = -1;
  for (let page = 1; page <= PROJECT_LIST_MAX_PAGES; page++) {
    if (signal.aborted) throw new Error('PROJECT_LIST_CANCELLED');
    const result = await loadPage({ page, limit: PROJECT_LIST_PAGE_LIMIT }, signal);
    if (signal.aborted) throw new Error('PROJECT_LIST_CANCELLED');
    const p = result.pagination;
    if (!p || p.page !== page || p.limit !== PROJECT_LIST_PAGE_LIMIT || !Number.isInteger(p.total) || p.total < 0 || !Number.isInteger(p.totalPages) || p.totalPages < 0 || p.totalPages > PROJECT_LIST_MAX_PAGES || !Array.isArray(result.projects) || result.projects.length > PROJECT_LIST_PAGE_LIMIT || p.totalPages !== Math.ceil(p.total / PROJECT_LIST_PAGE_LIMIT)) throw new Error('PROJECT_LIST_INCOMPLETE');
    if (page === 1) { total = p.total; totalPages = p.totalPages; }
    if (p.total !== total || p.totalPages !== totalPages) throw new Error('PROJECT_LIST_CHANGED');
    for (const project of result.projects) { if (!project.id || ids.has(project.id)) throw new Error('PROJECT_LIST_CHANGED'); ids.add(project.id); projects.push(project); }
    if (page >= totalPages) {
      if (projects.length !== total) throw new Error('PROJECT_LIST_INCOMPLETE');
      return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    if (result.projects.length !== PROJECT_LIST_PAGE_LIMIT) throw new Error('PROJECT_LIST_INCOMPLETE');
  }
  throw new Error('PROJECT_LIST_INCOMPLETE');
}
