import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { projectStatusLabels } from '../src/localization/statusLabels.mjs';

const jsx = (type, props) => ({ type, props });
const native = { FlatList: 'FlatList', View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: value => value } };
const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
function compileSource(source, extra = {}) {
  const exports = {}, modules = { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native, ...extra };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, AbortController, URLSearchParams, require: key => { assert.ok(key in modules, `Unmocked import ${key}`); return modules[key]; } });
  return exports;
}
const compile = (file, modules) => compileSource(read(file), modules);
const model = compile('features/projects/projectListModel.ts');
const data = compile('features/projects/projectListData.ts');
const tokens = compile('theme/tokens.ts');
const webRead = file => readFileSync(new URL('../../frontend-web/src/features/' + file, import.meta.url), 'utf8');
const webHistory = compileSource(webRead('results/historyFilters.ts'));
const webModel = compileSource(webRead('projects/projectListFilters.ts'), { '../results/historyFilters.ts': webHistory });
const webPresentation = compileSource(webRead('projects/projectListPresentation.ts'));
const plain = value => JSON.parse(JSON.stringify(value));
const base = { '@/theme/tokens': tokens, '@/components/common/Button': { Button: 'Button' }, '@/components/common/Card': { Card: 'Card' }, '@/components/common/Input': { Input: 'Input' } };
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children, node.props?.ListHeaderComponent, node.props?.ListFooterComponent, node.props?.ListEmptyComponent].flat(Infinity).flatMap(nodes)];
const texts = node => nodes(node).flatMap(n => [n.props.children].flat(Infinity).filter(value => typeof value === 'string'));
const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const fixture = (i, extra = {}) => ({ id: String(i).padStart(24, '0'), name: `Dự án ${i}`, status: 'TRANSCRIBED', progress: 100, sourceLanguage: 'vi', createdAt: new Date(2026, 9, i % 24 + 1).toISOString(), updatedAt: new Date(2026, 9, i % 24 + 1).toISOString(), metadataState: { media: 'EMPTY', translation: 'EMPTY' }, ...extra });
function hooks() {
  let values = [], cursor = 0;
  return { begin: () => { cursor = 0; }, useState: initial => { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; }, useRef: initial => { const i = cursor++; return values[i] ??= { current: initial }; }, useCallback: fn => fn };
}
test('full dataset reads existing pages100 sequentially before search and displays pages10 exactly like Web', async () => {
  const all = Array.from({ length: 205 }, (_, i) => fixture(i)), calls = [];
  const loaded = await data.loadCompleteProjectList(async (input, signal) => { assert.equal(signal.aborted, false); calls.push(input); return { projects: all.slice((input.page - 1) * 100, input.page * 100), pagination: { ...input, total: 205, totalPages: 3 } }; }, new AbortController().signal);
  assert.deepEqual(plain(calls), [1, 2, 3].map(page => ({ page, limit: 100 })));
  assert.equal(loaded.length, 205); assert.equal(new Set(loaded.map(p => p.id)).size, 205);
  const found = model.filterAndSortProjects(loaded, { ...model.defaultProjectListFilters, query: 'du an 204' });
  assert.equal(found.length, 1); assert.equal(found[0].id, all[204].id);
  for (const page of [1, 2, 21, 100, 0, NaN]) {
    const actual = model.projectListPage(loaded, page), expected = webPresentation.projectListPage(loaded, page);
    for (const key of ['projects', 'page', 'totalPages', 'total']) assert.deepEqual(plain(actual[key]), plain(expected[key]));
  }
});
test('loader rejects changed totals, duplicate IDs, missing rows and invalid pagination instead of partial results', async () => {
  for (const problem of ['duplicate', 'changed', 'short', 'metadata']) {
    const loader = async ({ page, limit }) => {
      const projects = Array.from({ length: page === 1 ? 100 : 1 }, (_, i) => fixture(page === 1 ? i : 100));
      if (page === 2 && problem === 'duplicate') projects[0] = fixture(0);
      if (page === 2 && problem === 'short') projects.pop();
      return { projects, pagination: problem === 'metadata' ? undefined : { page, limit, total: page === 2 && problem === 'changed' ? 102 : 101, totalPages: 2 } };
    };
    await assert.rejects(data.loadCompleteProjectList(loader, new AbortController().signal), /PROJECT_LIST_(CHANGED|INCOMPLETE)/);
  }
});
test('bounded loader, empty account, read error and cancellation never loop or create fake runtime data', async () => {
  let count = 0;
  await assert.rejects(data.loadCompleteProjectList(async ({ page, limit }) => { count++; return { projects: [], pagination: { page, limit, total: 10001, totalPages: 101 } }; }, new AbortController().signal), /INCOMPLETE/);
  assert.equal(count, 1);
  const empty = await data.loadCompleteProjectList(async input => ({ projects: [], pagination: { ...input, total: 0, totalPages: 0 } }), new AbortController().signal);
  assert.equal(empty.length, 0);
  await assert.rejects(data.loadCompleteProjectList(async () => { throw Error('offline'); }, new AbortController().signal), /offline/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(data.loadCompleteProjectList(async () => assert.fail('No read after cancellation'), controller.signal), /CANCELLED/);
});
test('search strips Vietnamese accents, every status/period/sort matches actual Web across full dataset', () => {
  const all = [fixture(1, { name: 'Bảo tàng Đà Nẵng', status: 'COMPLETED' }), fixture(2, { name: 'Bao tang 10', status: 'FAILED' }), fixture(3, { name: 'Bảo tàng 2', status: 'TRANSLATING' }), fixture(4, { createdAt: 'invalid' }), fixture(5, { createdAt: '2025-12-31T23:59:00+07:00' })];
  for (const period of model.projectPeriodOptions.map(p => p[0])) for (const status of ['ALL', ...Object.keys(projectStatusLabels)]) for (const sort of model.projectSortOptions.map(p => p[0])) {
    const filters = { ...model.defaultProjectListFilters, period, status, sort, from: '2026-10-01', to: '2026-10-31', query: 'bao tang' };
    const before = JSON.stringify(all);
    assert.deepEqual(plain(model.filterAndSortProjects(all, filters, new Date(2026, 9, 24))), plain(webModel.filterAndSortProjects(all, filters, new Date(2026, 9, 24))));
    assert.equal(JSON.stringify(all), before);
  }
  assert.equal(model.filterAndSortProjects(all, { ...model.defaultProjectListFilters, query: 'da nang' }).length, 1);
  assert.equal(model.filterAndSortProjects(all, { ...model.defaultProjectListFilters, status: 'COMPLETED' }).length, 1, 'progress100 is not COMPLETED');
});
test('date validation preserves Web valid-date semantics and native text rejects invalid dates', () => {
  for (const [from, to] of [['', ''], ['2026-10-31', '2026-10-01'], ['2024-02-29', '2024-02-29']]) {
    const filters = { ...model.defaultProjectListFilters, period: 'CUSTOM', from, to };
    assert.equal(model.projectDateError(filters), webHistory.historyDateError(filters));
  }
  assert.ok(model.projectDateError({ ...model.defaultProjectListFilters, period: 'CUSTOM', from: '2025-02-29', to: '2025-03-01' }));
  assert.equal(model.filterAndSortProjects([], model.defaultProjectListFilters).length, 0);
});
test('language presentation equals Web including missing/error/unknown metadata and catalog labels', () => {
  for (const translation of ['READY', 'EMPTY', 'ERROR', 'UNKNOWN']) for (const targetLanguage of [undefined, 'en', 'th', 'zh-cn']) {
    const p = fixture(1, { targetLanguage, metadataState: { media: 'READY', translation } });
    assert.equal(model.projectListLanguagePair(p), webPresentation.projectListLanguagePair(p));
  }
});
test('filters are draft until Search; collapse retains edits; reset is draft-only and invalid dates block apply', () => {
  const react = hooks(), applied = [];
  const Component = compile('features/projects/ProjectListFilters.tsx', { ...base, react, '@/localization/statusLabels.mjs': { projectStatusLabels }, './projectListModel': model }).ProjectListFilters;
  let value = { ...model.defaultProjectListFilters };
  const render = () => { react.begin(); return Component({ applied: value, loading: false, onApply: filters => { value = filters; applied.push(filters); } }); };
  const button = label => nodes(render()).find(n => n.type === 'Button' && n.props.children === label);
  const toggle = () => nodes(render()).find(n => n.type === 'Button' && n.props.accessibilityState?.expanded !== undefined).props.onPress();
  assert.equal(nodes(render()).some(n => n.props.label === 'Thời gian'), false);
  nodes(render()).find(n => n.type === 'Input').props.onChangeText('  bao tang  ');
  toggle();
  nodes(render()).find(n => n.props.label === 'Sắp xếp').props.onChange('NAME_ASC');
  nodes(render()).find(n => n.props.label === 'Trạng thái').props.onChange('COMPLETED');
  toggle(); toggle();
  assert.equal(nodes(render()).find(n => n.props.label === 'Sắp xếp').props.value, 'NAME_ASC');
  assert.equal(applied.length, 0);
  button('Tìm kiếm').props.onPress(); assert.equal(applied.length, 1); assert.equal(value.query, 'bao tang');
  assert.equal(nodes(render()).find(n => n.props.accessibilityState?.expanded !== undefined).props.accessibilityLabel, 'Bộ lọc, 2 bộ lọc nâng cao đang áp dụng');
  toggle(); button('Đặt lại').props.onPress(); assert.equal(value.status, 'COMPLETED'); assert.equal(applied.length, 1);
  button('Tìm kiếm').props.onPress(); assert.equal(value.status, 'ALL'); assert.equal(applied.length, 2);
  toggle(); nodes(render()).find(n => n.props.label === 'Thời gian').props.onChange('CUSTOM');
  button('Tìm kiếm').props.onPress(); assert.equal(applied.length, 2); assert.ok(nodes(render()).some(n => n.props.accessibilityRole === 'alert'));
});

function screen(state = {}) {
  const react = hooks(), pushes = []; let reloads = 0;
  const Component = compile('screens/ProjectsScreen.tsx', { ...base, react, 'expo-router': { router: { push: path => pushes.push(path) } }, '@/components/common/EmptyState': { EmptyState: 'EmptyState' }, '@/components/common/ErrorState': { ErrorState: 'ErrorState' }, '@/components/common/Spinner': { Spinner: 'Spinner' }, '@/features/projects/ProjectListCard': { ProjectListCard: 'ProjectListCard' }, '@/features/projects/ProjectListFilters': { ProjectListFilters: 'ProjectListFilters' }, '@/features/projects/projectListModel': model, '@/features/projects/useCompleteProjectList': { useCompleteProjectList: () => ({ projects: [], isLoading: false, error: null, reload: () => { reloads++; }, ...state }) } }).ProjectsScreen;
  return { render: () => { react.begin(); return Component(); }, pushes, reloads: () => reloads };
}
test('Projects screen uses full collection, local pages10 and apply resets page1 without additional workflow', () => {
  const all = Array.from({ length: 23 }, (_, i) => fixture(i)), s = screen({ projects: all });
  const first = s.render(); assert.equal(first.props.data.length, 10);
  nodes(first).find(n => n.type === 'Button' && n.props.children === 'Trang sau').props.onPress();
  assert.notDeepEqual(plain(s.render().props.data), plain(first.props.data));
  nodes(s.render()).find(n => n.type === 'ProjectListFilters').props.onApply({ ...model.defaultProjectListFilters, query: 'dự án 22' });
  assert.equal(s.render().props.data.length, 1); assert.equal(s.render().props.data[0].id, all[22].id);
  assert.ok(texts(s.render()).includes('Trang '));
  nodes(s.render()).find(n => n.type === 'Button' && n.props.children === 'Tạo dự án').props.onPress();
  assert.deepEqual(s.pushes, ['/projects/new']);
  assert.equal(s.render().props.keyExtractor(all[0]), all[0].id);
  assert.equal(s.render().props.renderItem({ item: all[0] }).type, 'ProjectListCard');
});
test('loading/error/true empty/filtered empty and incomplete metadata remain distinct', () => {
  const loading = screen({ isLoading: true }).render(); assert.ok(nodes(loading).some(n => n.type === 'Spinner')); assert.equal(loading.props.data.length, 0);
  const error = screen({ error: 'offline' }); const tree = error.render(); assert.equal(tree.props.data.length, 0); nodes(tree).find(n => n.type === 'ErrorState').props.onRetry(); assert.equal(error.reloads(), 1);
  assert.equal(nodes(screen().render()).find(n => n.type === 'EmptyState').props.title, 'Chưa có dự án');
  const s = screen({ projects: [fixture(1, { metadataState: { media: 'ERROR', translation: 'ERROR' } })] });
  assert.ok(texts(s.render()).some(t => t.includes('Dữ liệu chưa đầy đủ.')));
  nodes(s.render()).find(n => n.type === 'ProjectListFilters').props.onApply({ ...model.defaultProjectListFilters, query: 'no match' });
  assert.equal(nodes(s.render()).find(n => n.type === 'EmptyState').props.title, 'Không tìm thấy dự án phù hợp');
});
test('card only shows real Web list fields; title opens exact existing detail route; no progress/update/mutation controls', () => {
  const pushes = [], workflow = { step: 'TRANSLATION', state: 'READY', canResume: true };
  const guard = compile('features/projects/dashboardResume.ts', { './languages': compile('features/projects/languages.ts') });
  const Card = compile('features/projects/ProjectListCard.tsx', { ...base, 'expo-router': { router: { push: path => pushes.push(path) } }, './DashboardResumeButton': { DashboardResumeButton: 'Resume' }, './ProjectStatusBadge': { ProjectStatusBadge: 'Badge' }, './dashboardResume': guard, './projectListModel': model }).ProjectListCard;
  const p = fixture(1, { workflow, name: 'Tên dài '.repeat(20) });
  const tree = Card({ project: p });
  const link = nodes(tree).find(n => n.props.accessibilityRole === 'link'); link.props.onPress(); assert.deepEqual(pushes, [`/projects/${p.id}`]);
  assert.equal(nodes(tree).find(n => n.type === 'Resume').props.label, 'Tiếp tục');
  assert.equal(nodes(tree).find(n => n.type === 'Badge').props.status, p.status);
  assert.equal(nodes(link).find(n => n.type === 'Text').props.numberOfLines, undefined);
  assert.ok(!texts(tree).some(t => /Tiến độ|Cập nhật|Xóa|Chỉnh sửa/.test(t)));
  assert.equal(nodes(Card({ project: fixture(1) })).some(n => n.type === 'Resume'), false);
  assert.equal(nodes(Card({ project: fixture(1, { workflow: { ...workflow, state: 'BLOCKED' } }) })).some(n => n.type === 'Resume'), false);
  assert.ok(flatten(link.props.style({ pressed: false })).minHeight >= 48);
});
test('Web workflow action labels stay matched for supported Backend states', () => {
  const webGuard = compileSource(webRead('projects/workflowRouteGuard.ts'));
  const webAction = compileSource(webRead('projects/projectAction.ts'), { './workflowRouteGuard.ts': webGuard }).projectAction;
  for (const [step, state] of [['UPLOAD', 'READY'], ['TRANSCRIPT', 'READY'], ['TRANSCRIPT', 'FAILED'], ['TRANSCRIPT', 'PROCESSING'], ['UNKNOWN', 'BLOCKED'], ['RESULT', 'COMPLETED']]) {
    const p = fixture(1, { workflow: { step, state, canResume: true, mediaType: 'VIDEO', targetLanguage: { code: 'en', source: 'RESULT' }, artifact: { resultReady: true } } });
    assert.equal(model.projectListActionLabel(p), webAction(p).label);
  }
});
test('list layout at360/393dp has natural cards, wrapping labels,48dp controls and footer clearance', () => {
  const tree = screen({ projects: [fixture(1)] }).render();
  assert.equal(tree.type, 'FlatList'); assert.equal(tree.props.style.flex, 1);
  assert.ok(tree.props.contentContainerStyle.paddingBottom >= tokens.spacing.lg);
  const toolbar = nodes(tree).find(n => n.props.accessibilityLabel === 'Phân trang dự án');
  assert.equal(toolbar.props.style.flexDirection, 'row');
  for (const child of toolbar.props.children) { assert.equal(child.props.style.flex, 1); assert.equal(child.props.style.minWidth, 0); assert.equal(child.props.children.props.wrapLabel, true); }
  for (const width of [360, 393]) assert.ok((width - 2 * tokens.spacing.md - tokens.spacing.sm) / 2 >= 144);
});

class ApiError extends Error { constructor(code, message, status) { super(message); this.code = code; this.status = status; } }
test('repository enrichment retains actual workflow and metadata uncertainty, reuses authenticated GET paths only', async () => {
  const calls = [];
  const project = fixture(1, { workflow: { step: 'TRANSLATION', state: 'READY', canResume: true } });
  const api = async (path, options) => { calls.push({ path, options }); if (path.includes('?')) return { projects: [project], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } }; if (path.endsWith('/media')) throw new ApiError('MEDIA_NOT_FOUND', 'no file', 404); return { translations: [] }; };
  const repo = compile('features/projects/projectRepository.ts', { '../../lib/api': { api, ApiError }, './projectEditing.mjs': { mergeUpdatedProject: () => assert.fail('No writes') } }).projectRepository;
  const controller = new AbortController();
  const response = await repo.listPage({ page: 1, limit: 100 }, controller.signal);
  assert.deepEqual(plain(response.projects[0].workflow), project.workflow);
  assert.deepEqual(plain(response.projects[0].metadataState), { media: 'EMPTY', translation: 'EMPTY' });
  assert.deepEqual(calls.map(c => c.path), [`/projects?page=1&limit=100`, `/projects/${project.id}/media`, `/projects/${project.id}/translations`]);
  for (const call of calls) { assert.equal(call.options?.method, undefined); assert.equal(call.options.signal, controller.signal); }
});
test('list hook rejects401, does not replace auth, and exposes no partial data on errors', async () => {
  const react = hooks(); let focus;
  const Hook = compile('features/projects/useCompleteProjectList.ts', { react, 'expo-router': { useFocusEffect: fn => { focus = fn; } }, '@/lib/api': { ApiError }, './projectRepository': { projectRepository: { listPage: async () => { throw new ApiError('UNAUTHORIZED', 'private', 401); } } }, './projectListData': data }).useCompleteProjectList;
  const render = () => { react.begin(); return Hook(); };
  assert.equal(render().isLoading, true); const cleanup = focus(); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(render().projects.length, 0); assert.match(render().error, /đăng nhập/); assert.equal(render().isLoading, false); cleanup();
});

test('list hook cancels blurred requests and ignores stale replies after a fresh focus', async () => {
  const react = hooks(); let focus; const pending = [];
  const Hook = compile('features/projects/useCompleteProjectList.ts', { react, 'expo-router': { useFocusEffect: fn => { focus = fn; } }, '@/lib/api': { ApiError }, './projectRepository': { projectRepository: { listPage: (input, signal) => new Promise(resolve => pending.push({ input, signal, resolve })) } }, './projectListData': data }).useCompleteProjectList;
  const render = () => { react.begin(); return Hook(); };
  render(); const blur = focus(); assert.equal(pending.length, 1);
  blur(); assert.equal(pending[0].signal.aborted, true);
  focus(); assert.equal(pending.length, 2);
  const result = project => ({ projects: [project], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
  pending[1].resolve(result(fixture(2))); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(render().projects[0].id, fixture(2).id);
  pending[0].resolve(result(fixture(1))); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(render().projects[0].id, fixture(2).id, 'old list cannot replace new focus data');
});

test('metadata transport errors remain ERROR, never a fabricated missing file or untranslated record', async () => {
  const p = fixture(1), api = async path => { if (path.includes('?')) return { projects: [p], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } }; throw new ApiError('SERVER_ERROR', 'private', 500); };
  const repo = compile('features/projects/projectRepository.ts', { '../../lib/api': { api, ApiError }, './projectEditing.mjs': { mergeUpdatedProject: () => assert.fail('No mutation') } }).projectRepository;
  const result = await repo.listPage({ page: 1, limit: 100 });
  assert.deepEqual(plain(result.projects[0].metadataState), { media: 'ERROR', translation: 'ERROR' });
  assert.equal(result.projects[0].status, p.status);
  assert.match(model.projectListLanguagePair(result.projects[0]), /Không tải được bản dịch/);
});
test('list action reuses same protected read-only resume implementation as Dashboard, never invokes legacy retry', () => {
  const card = read('features/projects/ProjectListCard.tsx');
  assert.match(card, /DashboardResumeButton/); assert.match(card, /dashboardWorkflowPath/);
  assert.doesNotMatch(card, /processingService|translationService|method:|retry\(|reset\(|generate\(/);
  assert.doesNotMatch(read('screens/ProjectsScreen.tsx'), /ProjectCard|mockProjects|demoProjects/);
  const resumeSource = read('features/projects/dashboardResume.ts');
  assert.match(resumeSource, /DRAFT_SAVED/); assert.match(resumeSource, /Không gửi lại/);
});
