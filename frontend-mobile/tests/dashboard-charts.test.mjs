import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { buildProjectTimeSeries as webSeries, buildDailyProjectSeries as webDaily, buildLinearProjectScale as webScale, buildProjectStatusDistribution as webDistribution } from '../../frontend-web/src/features/projects/dashboardMetrics.mjs';
import { projectStatusLabels } from '../src/localization/statusLabels.mjs';

const jsx = (type, props) => ({ type, props });
const native = { View: 'View', Text: 'Text', ScrollView: 'ScrollView', StyleSheet: { create: value => value } };
const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
function compile(file, extra = {}) {
  const exports = {};
  const modules = { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native, ...extra };
  runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: key => { assert.ok(key in modules, `Forbidden API/native import: ${key}`); return modules[key]; },
  });
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const tokens = compile('theme/tokens.ts');
const metrics = compile('features/projects/dashboardChartMetrics.ts');
const utils = compile('features/projects/projectUtils.ts', {
  './languages': compile('features/projects/languages.ts'), '../../localization/statusLabels.mjs': { projectStatusLabels },
});
const today = new Date(2026, 9, 24);
const createdAt = day => new Date(2026, 9, day, 12).toISOString();
const record = (status = 'DRAFT', day = 24) => Object.freeze({ id: status + day, name: 'Test only', status, progress: 100, sourceLanguage: 'vi', createdAt: createdAt(day), updatedAt: createdAt(24) });
function render(projects, complete = true) {
  return compile('features/projects/DashboardCharts.tsx', {
    '@/theme/tokens': tokens, '@/components/common/Card': { Card: 'Card' },
    'react-native-svg': { default: 'Svg', Circle: 'Circle', G: 'G' },
    './projectUtils': utils, './dashboardChartMetrics': metrics,
    'react': { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] },
    './DashboardTimeFilter': { DashboardTimeFilter: 'DashboardTimeFilter' },
  }).DashboardCharts({ projects, today, complete });
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
}
const texts = tree => nodes(tree).flatMap(node => [node.props?.children].flat(Infinity).filter(value => typeof value === 'string'));

test('month counts first/last full calendar days once, excluding adjacent months and ignoring updatedAt', () => {
  const date = (day, hour = 12) => new Date(2026, 9, day, hour, 59, 59, 999).toISOString();
  const projects = [date(1, 0), date(15), date(31, 23), date(0, 23), date(32, 0)].map((createdAt, id) => Object.freeze({ id: String(id), createdAt, updatedAt: date(10) }));
  const month = metrics.buildProjectTimeSeries(projects, 'month', today);
  assert.deepEqual(plain(month), webSeries(projects, 'month', today));
  assert.equal(month.length, 31);
  assert.equal(month[0].value, 1); assert.equal(month[14].value, 1); assert.equal(month[30].value, 1);
  assert.equal(month.reduce((sum, item) => sum + item.value, 0), 3);
  assert.equal(new Set(month.map(item => item.key)).size, 31);
});

test('leap day and December/January boundaries match Web totals for month and year', () => {
  const projects = [new Date(2024, 1, 29, 23, 59), new Date(2024, 2, 1), new Date(2025, 11, 31, 23, 59), new Date(2026, 0, 1)].map((date, id) => ({ id: String(id), createdAt: date.toISOString() }));
  for (const [anchor, expected] of [[new Date(2024, 1, 1), 1], [new Date(2025, 11, 1), 1], [new Date(2026, 0, 1), 1]]) {
    const month = metrics.buildProjectTimeSeries(projects, 'month', anchor);
    assert.deepEqual(plain(month), webSeries(projects, 'month', anchor));
    assert.equal(month.reduce((sum, item) => sum + item.value, 0), expected);
    const year = metrics.buildProjectTimeSeries(projects, 'year', anchor);
    assert.deepEqual(plain(year), webSeries(projects, 'year', anchor));
  }
  assert.equal(metrics.buildProjectTimeSeries(projects, 'month', new Date(2024, 1, 1))[28].value, 1);
});

test('device timezone boundaries equal Web in UTC, Vietnam and Los Angeles; no end-of-day cutoff', () => {
  const original = process.env.TZ;
  const originalZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  const projects = ['2026-09-30T17:00:00Z', '2026-10-31T17:00:00Z', '2026-10-31T23:59:59.999Z'].map((createdAt, id) => ({ id: String(id), createdAt }));
  try {
    for (const [timezone, expected] of [['UTC', 2], ['Asia/Ho_Chi_Minh', 1], ['America/Los_Angeles', 2]]) {
      process.env.TZ = timezone;
      const anchor = new Date(2026, 9, 24);
      const month = metrics.buildProjectTimeSeries(projects, 'month', anchor);
      assert.deepEqual(plain(month), webSeries(projects, 'month', anchor));
      assert.equal(month.reduce((sum, day) => sum + day.value, 0), expected, timezone);
    }
  } finally {
    // Windows does not restore Date's timezone cache when TZ is only deleted.
    process.env.TZ = original ?? originalZone;
    if (original === undefined) delete process.env.TZ;
  }
});

test('daily mapping matches Web exactly: local calendar, createdAt only, seven days, invalid dates excluded', () => {
  const projects = Object.freeze([record('DRAFT', 18), record('COMPLETED', 24), record('TRANSLATING', 24), record('FAILED', 17), record('DRAFT', 25), { updatedAt: createdAt(23) }, { createdAt: 'invalid' }]);
  const result = metrics.buildDailyProjectSeries(projects, today);
  assert.deepEqual(plain(result), webDaily(projects, today));
  assert.equal(result.length, 7);
  assert.equal(result[0].value, 1);
  assert.equal(result[6].value, 2);
  assert.equal(result.reduce((sum, day) => sum + day.value, 0), 3);
  assert.throws(() => metrics.buildDailyProjectSeries([], new Date('invalid')), /valid local chart date/);
});

test('bar scale matches Web for zero, negative, large and nonfinite values without divide-by-zero', () => {
  for (const max of [0, 1, 3, 9, 21, 999, -1, NaN, Infinity]) {
    const scale = metrics.buildLinearProjectScale(max);
    assert.deepEqual(plain(scale), webScale(max));
    assert.ok(scale.maximum >= 1);
    assert.ok(scale.ticks.includes(0));
  }
});

test('status totals and percentages match Web; progress100 is not COMPLETED', () => {
  const projects = Object.freeze([record('COMPLETED'), record('TRANSLATING'), record('FAILED'), record('DRAFT')]);
  const statistics = utils.calculateProjectStatistics(projects);
  assert.deepEqual(plain(statistics), { total: 4, completed: 1, processing: 1, failed: 1 });
  const result = metrics.buildProjectStatusDistribution(statistics);
  assert.deepEqual(plain(result), webDistribution(statistics));
  assert.deepEqual(Array.from(result, item => item.percentage), [25, 25, 25, 25]);
  assert.equal(result.reduce((sum, item) => sum + item.value, 0), projects.length);
  assert.equal(result.reduce((sum, item) => sum + item.percentage, 0), 100);
  assert.equal(projects[1].status, 'TRANSLATING');
  assert.deepEqual(plain(metrics.buildProjectStatusDistribution({ total: 3, completed: 1, processing: 1, failed: 1 })), webDistribution({ total: 3, completed: 1, processing: 1, failed: 1 }));
  assert.throws(() => metrics.buildProjectStatusDistribution({ total: 1, completed: 2, processing: 0, failed: 0 }), /exceed/);
});

test('empty distribution and donut geometry never fabricate positive values or invalid arcs', () => {
  const empty = metrics.buildProjectStatusDistribution({ total: 0, completed: 0, processing: 0, failed: 0 });
  assert.ok(empty.every(item => item.value === 0 && item.percentage === 0));
  assert.equal(metrics.buildDonutSegments(empty).length, 0);
  const distribution = metrics.buildProjectStatusDistribution({ total: 4, completed: 1, processing: 2, failed: 0 });
  const segments = metrics.buildDonutSegments(distribution);
  assert.deepEqual(Array.from(segments, item => item.key), ['completed', 'processing', 'other']);
  assert.equal(Math.abs(segments[0].dashOffset), 0);
  assert.ok(segments[1].dashOffset < 0);
  for (const segment of segments) {
    assert.ok(segment.dashArray.every(value => Number.isFinite(value) && value >= 0));
    assert.ok(Math.abs(segment.dashArray.reduce((sum, value) => sum + value, 0) - metrics.DONUT_CIRCUMFERENCE) < 0.001);
  }
});

test('empty UI has two cards, zero total and explicit empty feedback instead of fake bars/slices', () => {
  const tree = render([]);
  assert.equal(nodes(tree).filter(node => node.type === 'Card').length, 2);
  assert.ok(texts(tree).includes('Chưa có dự án trong khoảng thời gian này.'));
  assert.ok(texts(tree).includes('Chưa có dữ liệu trạng thái dự án.'));
  assert.equal(nodes(tree).filter(node => node.type === 'Circle').length, 1, 'track only');
  assert.ok(nodes(tree).some(node => node.props.accessibilityRole === 'image' && node.props.accessibilityLabel.startsWith('Tổng 0')));
});

test('incomplete account data never renders charts or partial totals as full-account statistics', () => {
  const tree = render([record('COMPLETED')], false);
  assert.equal(nodes(tree).filter(node => node.type === 'Card').length, 2);
  assert.equal(nodes(tree).some(node => node.type === 'Svg'), false);
  assert.equal(nodes(tree).some(node => node.props.accessibilityRole === 'image'), false);
  assert.equal(texts(tree).filter(value => value.includes('Chưa tải đủ dữ liệu')).length, 2);
  assert.equal(texts(tree).includes('Thống kê trên toàn bộ dự án của tài khoản.'), false);
});

test('charts show truthful scope, accessible date counts and legends with semantic colors', () => {
  const tree = render([record('COMPLETED'), record('TRANSLATING'), record('DRAFT'), { ...record('FAILED'), createdAt: undefined }]);
  assert.equal(texts(tree).filter(value => value === 'Thống kê trên toàn bộ dự án của tài khoản.').length, 2);
  const dailyLabels = nodes(tree).filter(node => /\d{2}\/\d{2}\/\d{4}: \d+ dự án/.test(node.props.accessibilityLabel ?? ''));
  assert.equal(dailyLabels.length, 7);
  const legend = nodes(tree).filter(node => /: \d+ dự án, \d+(\.\d+)?%/.test(node.props.accessibilityLabel ?? ''));
  assert.equal(legend.length, 4);
  const arcs = nodes(tree).filter(node => node.type === 'Circle' && node.props.strokeDasharray);
  assert.deepEqual(arcs.map(node => node.props.stroke), [tokens.colors.success, tokens.colors.info, tokens.colors.error, tokens.colors.textMuted]);
  assert.ok(texts(tree).some(value => value.includes('dự án chưa có ngày tạo hợp lệ')));
});

test('responsive stacked cards fit360/393dp: flexible columns, bounded donut, wrapping legend, no fixed label clipping', () => {
  const tree = render([record('COMPLETED')]);
  assert.equal(tree.props.style.width, '100%');
  assert.equal(tree.props.style.flexDirection, undefined, 'default column stack');
  const plot = nodes(tree).find(node => node.type === 'View' && Array.isArray(node.props.style) && node.props.style[0]?.flexDirection === 'row');
  assert.ok(plot);
  for (const column of plot.props.children) {
    assert.equal(column.props.style.flex, 1);
    assert.equal(column.props.style.minWidth, 0);
  }
  const donut = nodes(tree).find(node => node.props.accessibilityRole === 'image');
  assert.equal(donut.props.style.maxWidth, '100%');
  assert.equal(donut.props.style.aspectRatio, 1);
  for (const viewport of [360, 393]) {
    const inner = viewport - 4 * tokens.spacing.md;
    assert.ok(donut.props.style.width <= inner);
    assert.ok((inner - 28 - tokens.spacing.xs - 6 * tokens.spacing.xs) / 7 > 28, 'seven native columns fit with axis');
  }
  const legends = nodes(tree).filter(node => node.props.style?.flexWrap === 'wrap');
  assert.equal(legends.length, 4);
  for (const label of nodes(tree).filter(node => node.type === 'Text')) {
    assert.equal(label.props.numberOfLines, undefined);
    assert.equal(label.props.allowFontScaling, undefined);
    assert.ok(label.props.style.fontFamily.startsWith('BeVietnamPro-'));
  }
});
