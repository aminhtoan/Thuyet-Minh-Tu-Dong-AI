import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildDailyProjectSeries, buildProjectTimeSeries, hasCompleteProjectDataset } from '../src/features/projects/dashboardMetrics.mjs';

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
  assert.match(source, /Chưa có dự án trong khoảng thời gian đã chọn/);
  assert.match(source, /ErrorState title="Không thể tải bảng điều khiển" description=\{error\} onRetry=\{\(\) => void reload\(\)\}/);
  assert.match(source, /Chưa có dự án/);
  assert.match(source, /Chưa có hoạt động gần đây/);
});

test('day, month and year ranges preserve zero buckets and local calendar boundaries', () => {
  const projects = [
    { createdAt: new Date(2025, 11, 31, 23, 45).toISOString() },
    { createdAt: new Date(2026, 0, 1, 0, 15).toISOString() },
    { createdAt: new Date(2026, 1, 28, 12).toISOString() },
  ];
  const daily = buildProjectTimeSeries(projects, 'day', new Date(2026, 0, 2));
  assert.equal(daily.length, 7);
  assert.deepEqual(daily.slice(-3).map((item) => item.value), [1, 1, 0]);

  const leapFebruary = buildProjectTimeSeries(projects, 'month', new Date(2024, 1, 10));
  assert.equal(leapFebruary.length, 29);
  assert.ok(leapFebruary.every((item) => item.value === 0));

  const yearly = buildProjectTimeSeries(projects, 'year', new Date(2026, 5, 1));
  assert.equal(yearly.length, 12);
  assert.equal(yearly[0].value, 1);
  assert.equal(yearly[1].value, 1);
  assert.equal(yearly[11].value, 0);
});

test('time filter popover exposes explicit modes, period inputs, actions and device timezone disclosure', async () => {
  const source = await readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8');
  for (const pair of ["['day', 'Ngày']", "['month', 'Tháng']", "['year', 'Năm']"]) assert.ok(source.includes(pair));
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /aria-expanded=\{isOpen\}/);
  assert.match(source, /<Icon name="calendar"/);
  assert.match(source, /type="date"/);
  assert.match(source, /type="number" inputMode="numeric" min="1970" max="9999"/);
  assert.match(source, /monthOptions\.map/);
  assert.match(source, />Đặt lại<\/button>/);
  assert.match(source, />Áp dụng<\/button>/);
  assert.match(source, /Dữ liệu được nhóm theo múi giờ thiết bị/);
  assert.match(source, /aria-pressed=\{draftMode === value\}/);
});

test('time filter keeps changes in a draft until Apply and Reset restores the default draft', async () => {
  const source = await readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8');
  assert.match(source, /const \[draftMode, setDraftMode\] = useState<ProjectTimeRange>\(mode\)/);
  assert.match(source, /const \[draftAnchor, setDraftAnchor\] = useState\(\(\) => new Date\(anchor\)\)/);
  assert.match(source, /const resetDraft = \(\) => \{\s*setDraftMode\('day'\);\s*setDraftAnchor\(new Date\(\)\);/);
  assert.match(source, /const applyDraft = \(\) => \{\s*onApply\(draftMode, draftAnchor\);\s*closePopover\(true\);/);
  assert.equal((source.match(/onApply\(draftMode, draftAnchor\)/g) ?? []).length, 1);
});

test('time filter closes on outside pointer and Escape, then restores trigger focus', async () => {
  const source = await readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8');
  assert.match(source, /document\.addEventListener\('pointerdown', handlePointerDown\)/);
  assert.match(source, /containerRef\.current\?\.contains\(event\.target as Node\)/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /closePopover\(true\)/);
  assert.match(source, /triggerRef\.current\?\.focus\(\)/);
  assert.match(source, /activeModeRef\.current\?\.focus\(\)/);
});

test('time filter popover is compact and remains viewport-safe in narrow dashboard containers', async () => {
  const [styles, icons] = await Promise.all([
    readFile(new URL('../src/styles/dashboard.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/common/Icon.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(styles, /\.dashboard-chart-filters__popover \{[\s\S]*width: min\(310px, calc\(100vw - 32px\)\);[\s\S]*border-radius: 14px;/);
  assert.match(styles, /@container dashboard \(max-width: 420px\)[\s\S]*width: min\(310px, calc\(100cqw - 30px\)\)/);
  assert.match(styles, /\.dashboard-chart-filters__trigger:focus-visible/);
  assert.match(icons, /calendar: 'M7 3v3m10-3v3/);
});

test('time chart remains fail-closed for the paginated 100-project dashboard request', async () => {
  const [source, repository] = await Promise.all([
    readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/projects/projectRepository.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(repository, /\/projects\?page=1&limit=100/);
  assert.match(source, /hasCompleteProjectDataset\(projects.length, pagination\)/);
  assert.match(source, /if \(!complete\) return <div className="dashboard-chart__empty"/);
});

test('dashboard recent projects use only real project fields', async () => {
  const source = await readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8');
  for (const label of ['Tên dự án', 'Cập nhật', 'Ngôn ngữ nguồn', 'Trạng thái', 'Tiếp tục']) assert.match(source, new RegExp(label));
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
