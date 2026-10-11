import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildDailyProjectSeries, hasCompleteProjectDataset } from '../src/features/projects/dashboardMetrics.mjs';

test('dashboard chart uses real creation dates and detects incomplete pagination', () => {
  const today = new Date(2026, 9, 11, 12);
  const series = buildDailyProjectSeries([
    { createdAt: '2026-10-11T01:00:00.000Z' },
    { createdAt: '2026-10-11T03:00:00.000Z' },
    { createdAt: '2026-10-09T03:00:00.000Z' },
  ], today);
  assert.deepEqual(series.map((item) => item.value), [0, 0, 0, 0, 1, 0, 2]);
  assert.equal(hasCompleteProjectDataset(100, { page: 1, limit: 100, total: 101, totalPages: 2 }), false);
  assert.equal(hasCompleteProjectDataset(3, { page: 1, limit: 100, total: 3, totalPages: 1 }), true);
});

test('dashboard exposes honest empty and insufficient-data states', async () => {
  const source = await readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8');
  assert.match(source, /Chưa đủ dữ liệu để lập biểu đồ/);
  assert.match(source, /Chưa có dự án mới trong 7 ngày qua/);
  assert.match(source, /Chưa có dự án/);
  assert.match(source, /Chưa có hoạt động gần đây/);
});

test('dashboard recent projects use only real project fields', async () => {
  const source = await readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8');
  for (const label of ['Tên dự án', 'Cập nhật', 'Ngôn ngữ nguồn', 'Trạng thái', 'Xem chi tiết']) assert.match(source, new RegExp(label));
  assert.doesNotMatch(source, /thumbnail|mockProjects|fixtureProjects/);
});

test('sidebar removes promotional card and quick actions keep supported routes', async () => {
  const [sidebar, dashboard] = await Promise.all([
    readFile(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(sidebar, /Sáng tạo không giới hạn|sidebar__help/);
  assert.match(sidebar, /navigationLabels\.account/);
  assert.match(dashboard, /route: '\/projects\/new'/);
  assert.equal((dashboard.match(/route: '\/projects(?:\/new)?'/g) ?? []).length, 4);
});
