import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
function compile(file, dependencies = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: key => key.endsWith('.css') ? {} : dependencies[key] ?? require(key), AbortController,
  });
  return exports;
}
const metrics = compile('utils/dashboardMetrics.ts');
const format = compile('utils/dashboardFormat.ts');
const payload = () => ({
  stats: { totalCustomers: 9, totalProjects: 31, processing: 0, failed: 9, totalListens: 20, listenStats: { total: 20, web: 12, mobile: 8 } },
  listenAnalytics: {
    topLanguages: [{ code: 'en', name: 'Tiếng Anh', flag: '🇬🇧', count: 12, percentage: 60, web: 7, mobile: 5 }],
    topAudios: [{ projectId: 'p1', title: 'Hiện vật A', languageCode: 'en', languageName: 'Tiếng Anh', flag: '🇬🇧', count: 12, web: 7, mobile: 5 }],
  },
  recentProjects: [],
  processingJobs: [],
  recentActivities: [],
  jobSummary: { queued: 0, processing: 0, completedToday: 15, failed: 28 },
  generatedAt: '2026-10-25T09:00:00Z',
});
const flush = () => new Promise(resolve => setImmediate(resolve));
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(v => nodes(v, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
test('KPI selector separates9 FAILED projects from28 FAILED jobs; no sum from recent lists or attempt data', () => {
  const d = payload(); const cards = metrics.dashboardKpis(d.stats);
  assert.deepEqual(Array.from(cards, c => c.value), [9, 31, 0, 9, 20]);
  assert.equal(cards[2].label, 'Dự án đang xử lý'); assert.equal(cards[3].label, 'Dự án thất bại'); assert.equal(cards[4].label, 'Lượt khách nghe');
  assert.equal(d.jobSummary.failed, 28); assert.equal(d.jobSummary.completedToday, 15);
  const backend = readFileSync(new URL('../../backend/src/services/admin.service.ts', import.meta.url), 'utf8');
  assert.match(backend, /Project.countDocuments\(\{ status: 'FAILED' \}\)/);
  assert.match(backend, /ProcessingJob.countDocuments\(\{ status: 'FAILED' \}\)/);
  assert.match(backend, /today.setHours\(0, 0, 0, 0\)/);
  assert.match(backend, /Project.find\(\).sort\(\{ updatedAt: -1 \}\).limit\(5\)/);
});
test('invalid/missing aggregates reject instead of silently converting unavailable data to zeros', () => {
  metrics.assertDashboardMetrics(payload());
  for (const value of [null, {}, { ...payload(), stats: { ...payload().stats, failed: undefined } }, { ...payload(), jobSummary: { ...payload().jobSummary, failed: -1 } }, { ...payload(), stats: { ...payload().stats, totalCustomers: NaN } }, { ...payload(), generatedAt: 'invalid' }]) assert.throws(() => metrics.assertDashboardMetrics(value));
  metrics.assertDashboardMetrics({ ...payload(), stats: { totalCustomers: 0, totalProjects: 0, processing: 0, failed: 0, totalListens: 0 } });
});
test('real service uses protected GET only, preserves status/progress and server totals, no fixture fallback', async () => {
  const d = payload(); d.recentProjects = [{ id: 'p', name: 'Synthetic', user: null, sourceLanguage: 'vi', targetLanguages: ['en'], status: 'FAILED', progress: 100, updatedAt: d.generatedAt }];
  const calls = []; const controller = new AbortController();
  const { adminDashboardService } = compile('services/adminDashboardService.ts', { '../utils/dashboardMetrics': metrics, '../lib/api': { adminApi: async (...args) => { calls.push(args); return d; } } });
  const result = await adminDashboardService.getDashboard({ signal: controller.signal });
  assert.equal(calls[0][0], '/admin/dashboard'); assert.equal(calls[0][1].signal, controller.signal); assert.equal(calls[0][1].method, undefined);
  assert.equal(result.source, 'ADMIN_API'); assert.equal(result.stats.totalProjects, 31); assert.equal(result.recentProjects.length, 1);
  assert.equal(result.recentProjects[0].status, 'FAILED'); assert.equal(result.recentProjects[0].progress, 100);
  assert.equal(result.recentProjects[0].customerName, 'Tài khoản không còn tồn tại');
  assert.equal(result.listenAnalytics?.topLanguages[0].code, 'en');
  assert.equal(result.listenAnalytics?.topAudios[0].title, 'Hiện vật A');
  const failing = compile('services/adminDashboardService.ts', { '../utils/dashboardMetrics': metrics, '../lib/api': { adminApi: async () => { throw Error('offline'); } } }).adminDashboardService;
  await assert.rejects(failing.getDashboard(), /offline/);
});
function hookHarness() {
  let cursor = 0, effects = []; const slots = [], pending = [];
  const react = { useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect(fn, deps) { const i = cursor++; const old = slots[i]; if (!old || deps.some((v, n) => v !== old.deps[n])) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); } };
  const { useAdminDashboard: runDashboardHook } = compile('hooks/useAdminDashboard.ts', { react, '../services/adminDashboardService': { adminDashboardService: { getDashboard: options => new Promise((resolve, reject) => pending.push({ options, resolve, reject })) } } });
  return { pending, render() { cursor = 0; effects = []; const result = runDashboardHook(); effects.forEach(fn => fn()); return result; }, unmount() { slots.forEach(s => s?.cleanup?.()); } };
}
test('loading, refresh duplicate lock, aborted stale completion and API error never show invented zeros', async () => {
  const h = hookHarness(); let state = h.render(); assert.equal(state.loading, true); assert.equal(state.data, null);
  state.refresh(); assert.equal(h.pending.length, 1);
  h.pending[0].resolve(payload()); await flush(); state = h.render(); assert.equal(state.data.stats.failed, 9); assert.equal(state.loading, false);
  state.refresh(); state.refresh(); state = h.render(); assert.equal(state.loading, true); assert.equal(h.pending.length, 2); assert.equal(h.pending[0].options.signal.aborted, true);
  h.pending[1].reject(Error('offline')); await flush(); state = h.render(); assert.equal(state.error, true); assert.equal(state.data, null); assert.equal(state.loading, false);
  state.refresh(); h.render(); assert.equal(h.pending.length, 3);
  h.pending[2].resolve(payload()); await flush(); state = h.render(); assert.equal(state.error, false); assert.equal(state.data.stats.totalProjects, 31);
  state.refresh(); h.render(); assert.equal(h.pending.length, 4); h.unmount();
  h.pending[3].resolve({ ...payload(), stats: { ...payload().stats, totalProjects: 999 } }); await flush();
  assert.equal(h.pending[3].options.signal.aborted, true); assert.equal(h.render().data.stats.totalProjects, 31);
});
function page(state) {
  const deps = { '../hooks/useAdminDashboard': { useAdminDashboard: () => state }, '../utils/dashboardMetrics': metrics, '../utils/dashboardFormat': format };
  for (const [name, path] of [['AdminPageHeader', 'layout'], ['StatCard', 'common'], ['Button', 'common'], ['DashboardSkeleton', 'dashboard'], ['DashboardErrorState', 'dashboard'], ['TopAudiosCard', 'dashboard'], ['LanguageDistributionCard', 'dashboard'], ['RecentProjectsCard', 'dashboard'], ['SystemStatusCard', 'dashboard'], ['ProcessingJobsCard', 'dashboard'], ['RecentActivityCard', 'dashboard']]) deps[`../components/${path}/${name}`] = { [name]: name };
  return compile('pages/AdminDashboardPage.tsx', deps).AdminDashboardPage();
}
test('actual Dashboard renders loading/error without KPI zeros and announces successful API data only after load', () => {
  for (const state of [{ loading: true, error: false, data: null }, { loading: false, error: true, data: null }]) {
    const tree = page({ ...state, refresh() {} }); assert.equal(nodes(tree, n => n.type === 'StatCard').length, 0);
    assert.equal(nodes(tree, n => n.type === (state.error ? 'DashboardErrorState' : 'DashboardSkeleton')).length, 1);
  }
  const tree = page({ loading: false, error: false, data: { ...payload(), source: 'ADMIN_API' }, refresh() {} });
  assert.equal(nodes(tree, n => n.type === 'StatCard').length, 5); assert.match(JSON.stringify(tree), /API quản trị/);
  assert.equal(nodes(tree, n => n.type === 'TopAudiosCard').length, 1);
  assert.equal(nodes(tree, n => n.type === 'LanguageDistributionCard').length, 1);
  assert.doesNotMatch(JSON.stringify(tree), /dữ liệu minh họa|Backend chưa kết nối/);
});
test('listen analytics cards render audio and language rankings with accurate metrics and honest empty states', () => {
  const { TopAudiosCard } = compile('components/dashboard/TopAudiosCard.tsx', { '../common/Card': { Card: 'section' } });
  const { LanguageDistributionCard } = compile('components/dashboard/LanguageDistributionCard.tsx', { '../common/Card': { Card: 'section' } });

  const emptyAudio = TopAudiosCard({ items: [] });
  assert.match(JSON.stringify(emptyAudio), /Chưa có dữ liệu lượt nghe thuyết minh/);
  const emptyLang = LanguageDistributionCard({ items: [] });
  assert.match(JSON.stringify(emptyLang), /Chưa có dữ liệu lượt nghe ngôn ngữ/);

  const fullAudio = TopAudiosCard({ items: payload().listenAnalytics.topAudios });
  assert.match(JSON.stringify(fullAudio), /Hiện vật A/);
  assert.match(JSON.stringify(fullAudio), /12/);
  assert.match(JSON.stringify(fullAudio), /Web/);
  assert.match(JSON.stringify(fullAudio), /Mobile/);

  const fullLang = LanguageDistributionCard({ items: payload().listenAnalytics.topLanguages });
  assert.match(JSON.stringify(fullLang), /Tiếng Anh/);
  assert.match(JSON.stringify(fullLang), /60/);
  assert.match(JSON.stringify(fullLang), /Web/);
  assert.match(JSON.stringify(fullLang), /Mobile/);

  const css = read('styles/dashboard.css');
  assert.match(css, /\.top-audios-card/);
  assert.match(css, /\.language-distribution-card/);
});
test('job summary and limited lists use honest units and labels, including empty job lists', () => {
  const { SystemStatusCard } = compile('components/dashboard/SystemStatusCard.tsx', { '../common/Card': { Card: 'section' }, '../common/StatusBadge': { StatusBadge: 'badge' } });
  const tree = SystemStatusCard({ summary: payload().jobSummary }); assert.match(JSON.stringify(tree), /ProcessingJob toàn hệ thống/); assert.match(JSON.stringify(tree), /múi giờ Backend/); assert.doesNotMatch(JSON.stringify(tree), /dữ liệu minh họa/);
  assert.match(read('components/dashboard/ProcessingJobsCard.tsx'), /gồm mọi trạng thái/);
  assert.match(read('components/dashboard/RecentProjectsCard.tsx'), /Tối đa 5 dự án/);
  assert.match(read('pages/AdminDashboardPage.tsx'), /không đếm dự án hoặc TranslationAttempt/);
});
test('Admin navigation and responsive shell retain existing destinations, guards and no Customer route redirection', () => {
  const { navigation } = compile('components/layout/navigation.ts');
  assert.deepEqual(Array.from(navigation.flatMap(g => g.items), i => i.to), ['/dashboard', '/users', '/projects', '/jobs', '/languages', '/voices', '/logs', '/settings']);
  const sidebar = read('components/layout/AdminSidebar.tsx'); assert.match(sidebar, /Link to="\/dashboard" className="brand"/); assert.match(sidebar, /Thuyết minh bảo tàng/); assert.match(sidebar, /isActive/);
  assert.doesNotMatch(read('components/layout/AdminAppShell.tsx'), /Dữ liệu minh họa|Backend chưa kết nối/);
  const css = read('styles/dashboard.css'); assert.match(css, /repeat\(4,minmax\(0,1fr\)\)|\.statistics/); assert.match(css, /max-width: 1100px/); assert.match(css, /overflow-x: auto/);
  const shell = read('styles/admin-shell.css'); assert.match(shell, /Be Vietnam Pro/); assert.match(shell, /:focus-visible/); assert.match(shell, /prefers-reduced-motion/);
  const { colors } = JSON.parse(readFileSync(new URL('../../design/customer/tokens.json', import.meta.url), 'utf8'));
  for (const token of ['primary', 'primaryHover', 'background', 'surface', 'textPrimary', 'textSecondary', 'border']) assert.ok(shell.toUpperCase().includes(colors[token].toUpperCase()));
});

