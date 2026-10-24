import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { buildProjectTimeSeries as webSeries } from '../../frontend-web/src/features/projects/dashboardMetrics.mjs';

const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
const jsx = (type, props) => ({ type, props });
const native = { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: value => value } };
function compile(file, modules = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, AbortController, setTimeout, clearTimeout,
    require: key => {
      const mocks = { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native, ...modules };
      assert.ok(key in mocks, 'Unmocked dependency: ' + key);
      return mocks[key];
    },
  });
  return exports;
}
function compileWeb(file, modules = {}) {
  const exports = {};
  const source = readFileSync(new URL('../../frontend-web/src/features/projects/' + file, import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: key => { assert.ok(key in modules); return modules[key]; },
  });
  return exports;
}
const data = compile('features/projects/dashboardData.ts');
const metrics = compile('features/projects/dashboardChartMetrics.ts');
const languages = compile('features/projects/languages.ts');
const resume = compile('features/projects/dashboardResume.ts', { './languages': languages });
const tokens = compile('theme/tokens.ts');
const webAction = compileWeb('projectAction.ts', { './workflowRouteGuard.ts': compileWeb('workflowRouteGuard.ts') }).projectAction;
class ApiError extends Error { constructor(status) { super('PRIVATE RESPONSE'); this.status = status; } }
const plain = value => JSON.parse(JSON.stringify(value));
const id = '0123456789abcdef01234567';
const record = (step = 'TRANSLATION', state = 'READY', extra = {}) => ({ id, status: 'TRANSCRIBED', progress: 100, workflow: { step, state, canResume: true, targetLanguage: null, mediaType: 'VIDEO', artifact: {}, ...extra } });
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
const text = node => nodes(node).flatMap(n => [n.props.children].flat(Infinity).filter(v => typeof v === 'string'));
function hooks() {
  let values = [], cursor = 0;
  const effects = [];
  return {
    begin: () => { cursor = 0; }, effects,
    useState: initial => { const slot = cursor++; if (!(slot in values)) values[slot] = typeof initial === 'function' ? initial() : initial; return [values[slot], value => { values[slot] = typeof value === 'function' ? value(values[slot]) : value; }]; },
    useRef: initial => { const slot = cursor++; return values[slot] ??= { current: initial }; },
    useCallback: callback => callback,
    useEffect: effect => { const slot = cursor++; if (!(slot in values)) { values[slot] = true; effects.push(effect()); } },
  };
}

test('Dashboard reads exactly one bounded page100 like Web; multiple pages suppress full-account claims', async () => {
  const calls = [];
  const projects = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
  const result = await data.loadDashboardDataset(async (input, signal) => { calls.push(input); assert.equal(signal.aborted, false); return { projects, pagination: { page: 1, total: 220, totalPages: 3, limit: 100 } }; }, new AbortController().signal);
  assert.deepEqual(plain(calls), [{ page: 1, limit: 100 }]);
  assert.equal(result.complete, false);
  assert.equal(data.dashboardDatasetComplete(projects, { page: 1, total: 100 }), true);
  assert.equal(data.dashboardDatasetComplete([], { page: 1, total: 0 }), true);
  for (const pagination of [null, { page: 2, total: 100 }, { page: 1, total: -1 }, { page: 1, total: 1.5 }]) assert.equal(data.dashboardDatasetComplete(projects, pagination), false);
  assert.equal(data.dashboardDatasetComplete([{ id: '1' }, { id: '1' }], { page: 1, total: 2 }), false);
});

test('dataset API errors, oversized response and cancellation never yield complete statistics', async () => {
  const controller = new AbortController();
  await assert.rejects(data.loadDashboardDataset(async () => { throw Error('offline'); }, controller.signal), /offline/);
  await assert.rejects(data.loadDashboardDataset(async () => ({ projects: Array(101), pagination: {} }), controller.signal), /INVALID_PAGE/);
  controller.abort();
  await assert.rejects(data.loadDashboardDataset(async () => ({ projects: [], pagination: { total: 0 } }), controller.signal), /CANCELLED/);
});

test('all modes equal actual Web selectors across leap day, month/year boundaries and missing dates', () => {
  const dates = ['2024-02-29T12:00:00+07:00', '2024-03-01T00:15:00+07:00', '2025-01-01T00:01:00Z', 'invalid'];
  const projects = dates.map(createdAt => ({ createdAt, updatedAt: '2040-01-01' }));
  for (const anchor of [new Date(2024, 1, 29), new Date(2025, 0, 1), new Date(2024, 11, 31)]) {
    for (const mode of ['day', 'month', 'year']) {
      assert.deepEqual(plain(metrics.buildProjectTimeSeries(projects, mode, anchor)), webSeries(projects, mode, anchor));
      assert.deepEqual(plain(metrics.buildProjectTimeSeries([], mode, anchor)), webSeries([], mode, anchor));
    }
  }
  assert.equal(metrics.buildProjectTimeSeries([], 'month', new Date(2024, 1, 1)).length, 29);
  assert.equal(metrics.formatChartDate(metrics.updateChartDate(new Date(2024, 0, 31), 2024, 1)), '2024-02-29');
  assert.equal(metrics.parseChartDate('2025-02-29'), null);
});

test('time filter edits are draft-only; apply commits; reopening discards edits; reset waits for apply', () => {
  const react = hooks(), applied = [];
  const Filter = compile('features/projects/DashboardTimeFilter.tsx', { react, '@/theme/tokens': tokens, '@/components/common/Button': { Button: 'Button' }, '@/components/common/Input': { Input: 'Input' }, './dashboardChartMetrics': metrics }).DashboardTimeFilter;
  let mode = 'day', anchor = new Date(2026, 0, 31);
  const render = () => { react.begin(); return Filter({ mode, anchor, onApply: (m, d) => { mode = m; anchor = d; applied.push([m, metrics.formatChartDate(d)]); } }); };
  const press = (tree, label) => nodes(tree).find(n => n.type === 'Button' && n.props.children === label).props.onPress();
  const toggle = tree => nodes(tree).find(n => n.props.accessibilityLabel === 'Bộ lọc thời gian').props.onPress();
  toggle(render());
  nodes(render()).find(n => n.props.accessibilityRole === 'radio' && n.props.children.props.children === 'Tháng').props.onPress();
  nodes(render()).find(n => n.type === 'Input' && n.props.label === 'Tháng').props.onChangeText('2');
  assert.equal(applied.length, 0);
  press(render(), 'Áp dụng');
  assert.deepEqual(applied, [['month', '2026-02-28']]);
  toggle(render());
  nodes(render()).find(n => n.props.accessibilityRole === 'radio' && n.props.children.props.children === 'Năm').props.onPress();
  nodes(render()).find(n => n.type === 'Input' && n.props.label === 'Năm').props.onChangeText('2024');
  press(render(), 'Áp dụng');
  assert.equal(applied[1][0], 'year');
  assert.equal(applied[1][1], '2024-02-28');
  toggle(render());
  press(render(), 'Đặt lại');
  assert.equal(applied.length, 2);
  toggle(render()); toggle(render());
  assert.equal(nodes(render()).find(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityState.checked).props.children.props.children, 'Năm');
  nodes(render()).find(n => n.type === 'Input' && n.props.label === 'Năm').props.onChangeText('bad');
  press(render(), 'Áp dụng');
  assert.ok(nodes(render()).some(n => n.props.accessibilityRole === 'alert'));
  assert.equal(applied.length, 2);
});

test('fresh Backend workflow, not cached project status/progress, determines existing Mobile route', async () => {
  const targetLanguage = { code: 'en', source: 'TRANSLATION' };
  for (const [step, state, path] of [['UPLOAD', 'READY', ''], ['TRANSCRIPT', 'PROCESSING', '/transcript'], ['TRANSLATION', 'READY', '/translation'], ['VOICE', 'READY', '/voice?language=en'], ['GENERATE', 'FAILED', '/generate?language=en'], ['RESULT', 'COMPLETED', '/result?language=en']]) {
    const target = ['VOICE', 'GENERATE', 'RESULT'].includes(step) ? targetLanguage : null;
    const fresh = record(step, state, { targetLanguage: target, artifact: { resultReady: true } });
    const result = await resume.resolveDashboardResume(id, { project: async () => fresh, attempt: async () => ({ attempt: null }) }, new AbortController().signal);
    assert.equal(result, `/projects/${id}${path}`);
    assert.equal(result, webAction(fresh).path);
  }
  for (const invalid of [record('UNKNOWN'), record('TRANSCRIPT', 'BLOCKED'), record('VOICE'), record('RESULT', 'COMPLETED'), record('TRANSCRIPT', 'READY', { canResume: false }), record('VOICE', 'READY', { targetLanguage: { code: 'th', source: 'TRANSLATION' } })]) assert.equal(resume.dashboardWorkflowPath(invalid), null);
});

test('valid date/month/year edits share one draft anchor across mode switches, like Web', () => {
  const react = hooks(), applied = [];
  const Filter = compile('features/projects/DashboardTimeFilter.tsx', { react, '@/theme/tokens': tokens, '@/components/common/Button': { Button: 'Button' }, '@/components/common/Input': { Input: 'Input' }, './dashboardChartMetrics': metrics }).DashboardTimeFilter;
  let mode = 'day', anchor = new Date(2026, 9, 24);
  const render = () => { react.begin(); return Filter({ mode, anchor, onApply: (m, d) => { mode = m; anchor = d; applied.push([m, metrics.formatChartDate(d)]); } }); };
  const choose = label => nodes(render()).find(n => n.props.accessibilityRole === 'radio' && n.props.children.props.children === label).props.onPress();
  const input = label => nodes(render()).find(n => n.type === 'Input' && n.props.label === label);
  const button = label => nodes(render()).find(n => n.type === 'Button' && n.props.children === label).props.onPress();
  nodes(render()).find(n => n.props.accessibilityLabel === 'Bộ lọc thời gian').props.onPress();
  input('Ngày kết thúc').props.onChangeText('2024-02-29');
  choose('Tháng');
  assert.equal(input('Tháng').props.value, '2'); assert.equal(input('Năm').props.value, '2024');
  choose('Năm'); input('Năm').props.onChangeText('2025');
  choose('Ngày'); assert.equal(input('Ngày kết thúc').props.value, '2025-02-28', 'leap day clamps like Web when year changes');
  choose('Tháng'); input('Tháng').props.onChangeText('12');
  choose('Năm'); input('Năm').props.onChangeText('2026');
  choose('Tháng'); input('Tháng').props.onChangeText('1');
  choose('Ngày'); assert.equal(input('Ngày kết thúc').props.value, '2026-01-28');
  assert.equal(applied.length, 0, 'draft edits do not apply or reload data');
  button('Áp dụng'); assert.deepEqual(applied, [['day', '2026-01-28']]);
  nodes(render()).find(n => n.props.accessibilityLabel === 'Bộ lọc thời gian').props.onPress();
  choose('Tháng'); input('Tháng').props.onChangeText('13'); button('Áp dụng');
  assert.equal(applied.length, 1); assert.ok(nodes(render()).some(n => n.props.accessibilityRole === 'alert'));
  button('Đặt lại'); assert.equal(applied.length, 1);
  assert.equal(input('Ngày kết thúc').props.value, metrics.formatChartDate(new Date()));
  button('Áp dụng'); assert.equal(applied[1][0], 'day');
});

test('saved English draft only permits supported later artifact-backed steps; Transcript does not require an existing transcript', async () => {
  const next = record('VOICE', 'READY', { targetLanguage: { code: 'en', source: 'TRANSLATION' } });
  assert.equal(await resume.resolveDashboardResume(id, { project: async () => next, attempt: async () => ({ attempt: { status: 'DRAFT_SAVED' } }) }, new AbortController().signal), `/projects/${id}/voice?language=en`);
  assert.equal(await resume.resolveDashboardResume(id, { project: async () => record('TRANSCRIPT'), attempt: async () => assert.fail('Do not require source/attempt before transcript exists') }, new AbortController().signal), `/projects/${id}/transcript`);
});

test('chart filter commits change bar range only; donut/account totals and source data stay unchanged', () => {
  const react = hooks();
  const utils = { calculateProjectStatistics: projects => ({ total: projects.length, completed: 1, processing: 0, failed: 0 }) };
  const Component = compile('features/projects/DashboardCharts.tsx', { react, '@/theme/tokens': tokens, '@/components/common/Card': { Card: 'Card' }, 'react-native-svg': { default: 'Svg', Circle: 'Circle', G: 'G' }, './projectUtils': utils, './dashboardChartMetrics': metrics, './DashboardTimeFilter': { DashboardTimeFilter: 'Filter' } }).DashboardCharts;
  const projects = Object.freeze([Object.freeze({ id, status: 'COMPLETED', createdAt: new Date(2024, 1, 29).toISOString() })]);
  const render = () => { react.begin(); return Component({ projects, complete: true, today: new Date(2024, 1, 29) }); };
  const before = nodes(render()).find(n => n.props.accessibilityRole === 'image').props.accessibilityLabel;
  const apply = (mode, date) => nodes(render()).find(n => n.type === 'Filter').props.onApply(mode, date);
  for (const [mode, count] of [['month', 29], ['year', 12], ['day', 7]]) {
    apply(mode, new Date(2024, 1, 29));
    const tree = render();
    assert.equal(nodes(tree).find(n => n.props.accessibilityRole === 'image').props.accessibilityLabel, before);
    const scroll = nodes(tree).find(n => n.type === 'ScrollView');
    assert.equal(scroll.props.horizontal, true);
    assert.equal(scroll.props.scrollEnabled, mode !== 'day');
    assert.equal(scroll.props.children.props.children.length, count);
    const width = scroll.props.children.props.style[1]?.width;
    assert.equal(width, mode === 'day' ? undefined : count * 44);
  }
  assert.equal(projects[0].status, 'COMPLETED');
});

test('durable UNCERTAIN/CLAIMED/failed/unknown attempts block resume; no retry/reset/provider calls', async () => {
  for (const status of ['UNCERTAIN', 'PROCESSING', 'NOT_SENT', 'EXPIRED', 'CLAIMED', 'FAILED_PRE_DISPATCH', 'FAILED_RESPONSE', 'unknown', 'DRAFT_SAVED']) {
    await assert.rejects(resume.resolveDashboardResume(id, { project: async () => record(), attempt: async () => ({ attempt: { status } }) }, new AbortController().signal), /Không gửi lại/);
  }
  await assert.rejects(resume.resolveDashboardResume(id, { project: async () => record(), attempt: async () => ({}) }, new AbortController().signal), /Chưa xác minh/);
});

test('wrong ID, unauthorized, missing project, server errors, timeout and aborted navigation fail closed', async () => {
  for (const status of [401, 403, 404, 500]) await assert.rejects(resume.resolveDashboardResume(id, { project: async () => { throw Object.assign(Error('safe fixture'), { status }); }, attempt: async () => assert.fail('No second read') }, new AbortController().signal), /safe fixture/);
  await assert.rejects(resume.resolveDashboardResume('invalid', {}, new AbortController().signal), /Không thể xác định/);
  await assert.rejects(resume.resolveDashboardResume(id, { project: async () => ({ ...record(), id: 'different' }) }, new AbortController().signal), /Không thể xác minh/);
  let requestSignal;
  await assert.rejects(resume.resolveDashboardResume(id, { project: async (_, signal) => { requestSignal = signal; return new Promise(() => {}); } }, new AbortController().signal, 5), /quá lâu/);
  assert.equal(requestSignal.aborted, true);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(resume.resolveDashboardResume(id, { project: async () => record() }, controller.signal), /Đã hủy/);
});

test('synchronous duplicate taps share a lock and cannot read/route twice', async () => {
  const lock = resume.createResumeLock(); let release, calls = 0;
  const operation = async () => { calls++; await new Promise(resolve => { release = resolve; }); return 'done'; };
  const first = lock(operation);
  assert.equal(await lock(operation), undefined);
  assert.equal(calls, 1); release(); assert.equal(await first, 'done');
  await lock(async () => { calls++; }); assert.equal(calls, 2);
});

test('resume button is inert on mount, uses authenticated GET only without refresh and rejects duplicate presses', async () => {
  const react = hooks(), requests = [], paths = []; let release;
  const api = async (path, options, refresh) => { requests.push({ path, options, refresh }); if (requests.length === 1) await new Promise(resolve => { release = resolve; }); return path.endsWith('/en') ? { attempt: null } : { project: record() }; };
  const Component = compile('features/projects/DashboardResumeButton.tsx', { react, 'expo-router': { router: { push: path => paths.push(path) } }, '@/lib/api': { api, ApiError }, '@/theme/tokens': tokens, '@/components/common/Button': { Button: 'Button' }, './dashboardResume': resume }).DashboardResumeButton;
  const render = () => { react.begin(); return Component({ projectId: id }); };
  const button = nodes(render()).find(n => n.type === 'Button');
  assert.equal(requests.length, 0);
  button.props.onPress(); button.props.onPress();
  assert.equal(requests.length, 1);
  assert.equal(nodes(render()).find(n => n.type === 'Button').props.disabled, true);
  release(); await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(paths, [`/projects/${id}/translation`]);
  assert.equal(requests.length, 2);
  for (const request of requests) { assert.equal(request.options.method, undefined); assert.equal(request.options.body, undefined); assert.equal(request.refresh, false); }
});

test('read-only resume error is visible without raw Backend body; unmount cancels without navigation', async () => {
  for (const unmount of [false, true]) {
    const react = hooks(), paths = []; let release;
    const Component = compile('features/projects/DashboardResumeButton.tsx', { react, 'expo-router': { router: { push: path => paths.push(path) } }, '@/lib/api': { ApiError, api: async () => { await new Promise(resolve => { release = resolve; }); throw Error('PRIVATE RESPONSE'); } }, '@/theme/tokens': tokens, '@/components/common/Button': { Button: 'Button' }, './dashboardResume': resume }).DashboardResumeButton;
    const render = () => { react.begin(); return Component({ projectId: id }); };
    nodes(render()).find(n => n.type === 'Button').props.onPress();
    if (unmount) react.effects.forEach(cleanup => cleanup?.());
    release(); await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(paths.length, 0);
    assert.equal(nodes(render()).some(n => n.props.accessibilityRole === 'alert'), !unmount);
    assert.ok(!text(render()).includes('PRIVATE RESPONSE'));
  }
});

test('Dashboard hook reloads only read data on focus/return and aborts stale reads on blur', async () => {
  const react = hooks(); let focus, calls = 0, signal;
  const Hook = compile('features/projects/useDashboardProjects.ts', { react, 'expo-router': { useFocusEffect: effect => { focus = effect; } }, './projectRepository': { projectRepository: { listPage: async (_, s) => { calls++; signal = s; return { projects: [], pagination: { page: 1, total: 0 } }; } } }, './dashboardData': data }).useDashboardProjects;
  const render = () => { react.begin(); return Hook(); };
  assert.equal(render().isLoading, true); assert.equal(calls, 0);
  const blur = focus(); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(render().complete, true); assert.equal(calls, 1);
  blur(); assert.equal(signal.aborted, true);
  focus(); await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(calls, 2);
});

test('Dashboard hook read failure exposes error and no partial data; safe read retry can recover', async () => {
  const react = hooks(); let focus, fail = true;
  const Hook = compile('features/projects/useDashboardProjects.ts', { react, 'expo-router': { useFocusEffect: effect => { focus = effect; } }, './projectRepository': { projectRepository: { listPage: async () => { if (fail) throw Error('PRIVATE'); return { projects: [], pagination: { page: 1, total: 0 } }; } } }, './dashboardData': data }).useDashboardProjects;
  const render = () => { react.begin(); return Hook(); };
  render(); focus(); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(render().complete, false); assert.equal(render().isLoading, false);
  assert.equal(render().projects.length, 0); assert.ok(render().error); assert.ok(!render().error.includes('PRIVATE'));
  fail = false; await render().reload(); assert.equal(render().complete, true); assert.equal(render().error, null);
});
