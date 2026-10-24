import type { Project, ProjectStatistics } from './types';

// Port of Web dashboardMetrics.mjs; parity is regression-tested for all three modes.
export type ProjectTimeRange = 'day' | 'month' | 'year';
function localDateKey(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildProjectTimeSeries(projects: readonly Pick<Project, 'createdAt'>[], mode: ProjectTimeRange, today = new Date()) {
  if (Number.isNaN(today.getTime())) throw new TypeError('A valid local chart date is required.');
  const anchor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const counts = new Map<string, number>();
  for (const project of projects) {
    const dateKey = project.createdAt ? localDateKey(project.createdAt) : null;
    const key = mode === 'year' ? dateKey?.slice(0, 7) : dateKey;
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (!['day', 'month', 'year'].includes(mode)) throw new TypeError('Unsupported project time range.');
  const length = mode === 'year' ? 12 : mode === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate() : 7;
  return Array.from({ length }, (_, index) => {
    const date = mode === 'year' ? new Date(anchor.getFullYear(), index, 1) : mode === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth(), index + 1) : new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - (6 - index));
    const dateKey = localDateKey(date)!;
    const key = mode === 'year' ? dateKey.slice(0, 7) : dateKey;
    return {
      key,
      label: mode === 'year' ? `Thg ${index + 1}` : mode === 'month' ? String(index + 1) : new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date),
      fullLabel: new Intl.DateTimeFormat('vi-VN', mode === 'year' ? { month: 'long', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date),
      value: counts.get(key) ?? 0,
    };
  });
}

export function buildDailyProjectSeries(projects: readonly Pick<Project, 'createdAt'>[], today = new Date()) {
  return buildProjectTimeSeries(projects, 'day', today);
}

export function formatChartDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseChartDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1970 || year > 9999) return null;
  const date = new Date(year, month - 1, day);
  return formatChartDate(date) === value ? date : null;
}

export function updateChartDate(date: Date, year: number, month: number) {
  return new Date(year, month, Math.min(date.getDate(), new Date(year, month + 1, 0).getDate()));
}

export function buildLinearProjectScale(maxValue: number) {
  const value = Number.isFinite(maxValue) ? Math.max(0, Math.ceil(maxValue)) : 0;
  const intervalCount = Math.min(4, Math.max(1, value));
  const step = Math.max(1, Math.ceil(value / intervalCount));
  const maximum = step * intervalCount;
  return { maximum, ticks: Array.from({ length: intervalCount + 1 }, (_, index) => maximum - index * step) };
}

export function buildProjectStatusDistribution(statistics: ProjectStatistics) {
  const total = Math.max(0, statistics.total);
  const completed = Math.max(0, statistics.completed);
  const processing = Math.max(0, statistics.processing);
  const failed = Math.max(0, statistics.failed);
  const classified = completed + processing + failed;
  if (classified > total) throw new RangeError('Project status counts exceed the total project count.');
  return [
    { key: 'completed' as const, label: 'Hoàn thành', value: completed },
    { key: 'processing' as const, label: 'Đang xử lý', value: processing },
    { key: 'failed' as const, label: 'Thất bại', value: failed },
    { key: 'other' as const, label: 'Khác', value: total - classified },
  ].map(item => ({ ...item, percentage: total ? Number(((item.value / total) * 100).toFixed(1)) : 0 }));
}

export const DONUT_RADIUS = 68;
export const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

export function buildDonutSegments(distribution: ReturnType<typeof buildProjectStatusDistribution>) {
  let offset = 0;
  return distribution.filter(item => item.value > 0).map(item => {
    const arcLength = (item.percentage / 100) * DONUT_CIRCUMFERENCE;
    const gap = Math.min(4, arcLength * 0.18);
    const length = Math.max(0, arcLength - gap);
    const segment = { ...item, dashOffset: -offset, dashArray: [length, DONUT_CIRCUMFERENCE - length] };
    offset += arcLength;
    return segment;
  });
}
