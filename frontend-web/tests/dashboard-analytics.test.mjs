import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildLinearProjectScale, buildProjectStatusDistribution } from '../src/features/projects/dashboardMetrics.mjs';

const [source, css] = await Promise.all([
  readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/dashboard.css', import.meta.url), 'utf8'),
]);

test('linear bar scale starts at zero and never inflates non-zero bars', () => {
  assert.deepEqual(buildLinearProjectScale(3), { maximum: 3, ticks: [3, 2, 1, 0] });
  assert.deepEqual(buildLinearProjectScale(5), { maximum: 8, ticks: [8, 6, 4, 2, 0] });
  assert.deepEqual(buildLinearProjectScale(0), { maximum: 1, ticks: [1, 0] });
  assert.match(source, /height: `\$\{hasData \? \(day\.value \/ scale\.maximum\) \* 100 : 0\}%`/);
  assert.doesNotMatch(source, /day\.value \? 8 : 0/);
});

test('status distribution preserves unclassified statuses as Khác', () => {
  const groups = buildProjectStatusDistribution({ total: 10, completed: 4, processing: 3, failed: 1 });
  assert.deepEqual(groups, [
    { key: 'completed', label: 'Hoàn thành', value: 4, percentage: 40 },
    { key: 'processing', label: 'Đang xử lý', value: 3, percentage: 30 },
    { key: 'failed', label: 'Thất bại', value: 1, percentage: 10 },
    { key: 'other', label: 'Khác', value: 2, percentage: 20 },
  ]);
  assert.throws(() => buildProjectStatusDistribution({ total: 1, completed: 1, processing: 1, failed: 0 }), /exceed/);
});

test('duplicate KPI row is removed while analytics keeps fail-closed classification', () => {
  assert.doesNotMatch(source, /dashboard-kpis|DashboardMetric|metricValue/);
  assert.doesNotMatch(css, /dashboard-kpis|dashboard-metric|dashboard-kpi/);
  assert.match(source, /<nav className="quick-actions"[\s\S]*?<div className="dashboard-overview dashboard-analytics">/);
  assert.match(source, /Chưa đủ dữ liệu trạng thái/);
  assert.match(source, /Cần toàn bộ danh sách dự án để tính tỷ lệ chính xác/);
});

test('bar tooltips expose real dates and values to hover and keyboard focus', () => {
  assert.match(source, /tabIndex=\{0\} aria-label=\{`\$\{day\.fullLabel\}: \$\{day\.value\} dự án`\}/);
  assert.match(source, /role="tooltip"/);
  assert.match(css, /\.dashboard \.dashboard-chart__column:hover \.dashboard-chart__tooltip,/);
  assert.match(css, /\.dashboard \.dashboard-chart__column:focus-visible \.dashboard-chart__tooltip/);
  assert.match(css, /\.dashboard \.dashboard-chart__gridlines/);
  assert.match(source, /buildProjectTimeSeries\(projects, mode, anchor\)/);
  assert.match(source, /dashboard-chart__plot--\$\{mode\}/);
  assert.match(css, /\.dashboard \.dashboard-chart__plot--month \{[\s\S]*?min-width: 1120px;/);
});

test('donut exposes SVG segments, textual legend, progress and equivalent focus detail', () => {
  assert.match(source, /DONUT_CIRCUMFERENCE/);
  assert.match(source, /strokeDasharray/);
  assert.match(source, /role="group" aria-label="Phân bố trạng thái dự án"/);
  assert.match(source, /onMouseEnter=\{\(\) => setActiveKey\(item\.key\)\}/);
  assert.match(source, /onFocus=\{\(\) => setActiveKey\(item\.key\)\}/);
  assert.match(source, /dashboard-donut__progress/);
  assert.match(source, /status-distribution-summary/);
  assert.match(css, /\.dashboard \.dashboard-analytics \{[\s\S]*?grid-template-columns: minmax\(0, 3fr\) minmax\(320px, 2fr\);/);
  assert.match(css, /@container dashboard \(max-width: 980px\) \{[\s\S]*?\.dashboard-analytics \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
});

test('zero-data and reduced-motion states remain explicit', () => {
  assert.match(source, /Chưa có dữ liệu trạng thái dự án/);
  assert.match(source, /Chưa có dự án trong khoảng thời gian đã chọn/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.dashboard \.dashboard-donut__segment/);
});
