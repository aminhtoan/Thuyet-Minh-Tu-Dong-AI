import type { Project, ProjectPagination } from './types';

export type ProjectTimeRange = 'day' | 'month' | 'year';
export type ProjectTimeDatum = { key: string; label: string; fullLabel: string; value: number };
export type DailyProjectDatum = ProjectTimeDatum;
export type ProjectStatusDistributionDatum = {
  key: 'completed' | 'processing' | 'failed' | 'other';
  label: string;
  value: number;
  percentage: number;
};

export function buildDailyProjectSeries(projects: readonly Pick<Project, 'createdAt'>[], today?: Date): DailyProjectDatum[];
export function buildProjectTimeSeries(projects: readonly Pick<Project, 'createdAt'>[], mode: ProjectTimeRange, selectedDate?: Date): ProjectTimeDatum[];
export function hasCompleteProjectDataset(projectCount: number, pagination: ProjectPagination | null | undefined): boolean;
export function buildLinearProjectScale(maxValue: number): { maximum: number; ticks: number[] };
export function buildProjectStatusDistribution(statistics: {
  total: number;
  completed: number;
  processing: number;
  failed: number;
}): ProjectStatusDistributionDatum[];
