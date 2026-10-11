import type { Project, ProjectPagination } from './types';

export type DailyProjectDatum = { key: string; label: string; fullLabel: string; value: number };

export function buildDailyProjectSeries(projects: readonly Pick<Project, 'createdAt'>[], today?: Date): DailyProjectDatum[];
export function hasCompleteProjectDataset(projectCount: number, pagination: ProjectPagination | null | undefined): boolean;
