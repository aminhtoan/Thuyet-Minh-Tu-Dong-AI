import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const jsx = (type, props) => ({ type, props });
const native = { View: 'View', Text: 'Text', FlatList: 'FlatList', Pressable: 'Pressable', StyleSheet: { create: value => value } };
function sourceCompile(source, imports = {}) {
  const exports = {}, modules = { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native, ...imports };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, AbortController, URLSearchParams, require: name => { assert.ok(name in modules, `No unmocked dependency: ${name}`); return modules[name]; } });
  return exports;
}
const compile = (file, imports) => sourceCompile(read('../src/' + file), imports);
const model = compile('features/results/libraryPresentation.ts');
const loader = compile('features/projects/projectListData.ts');
const tokens = compile('theme/tokens.ts');
const webGuard = sourceCompile(read('../../frontend-web/src/features/projects/workflowRouteGuard.ts'));
const web = sourceCompile(read('../../frontend-web/src/features/results/libraryPresentation.ts'), { '../projects/workflowRouteGuard.ts': webGuard });
const plain = value => JSON.parse(JSON.stringify(value));
const fixture = (id = 'one', extra = {}) => ({ id, name: 'Bảo tàng ' + id, status: 'COMPLETED', sourceLanguage: 'vi', progress: 100, updatedAt: '2026-10-24T07:00:00Z',
  workflow: { step: 'RESULT', state: 'COMPLETED', processing: null, mediaType: 'VIDEO', targetLanguage: { code: 'en', source: 'RESULT' }, artifact: { resultReady: true, narrationReady: false } }, ...extra });
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children, node.props?.ListHeaderComponent, node.props?.ListEmptyComponent, node.props?.ListFooterComponent].flat(Infinity).flatMap(nodes)];
function hooks() {
  const values = []; let cursor = 0;
  return { begin: () => { cursor = 0; }, useState: initial => { const slot = cursor++; if (!(slot in values)) values[slot] = initial; return [values[slot], next => { values[slot] = typeof next === 'function' ? next(values[slot]) : next; }]; }, useRef: initial => { const slot = cursor++; return values[slot] ??= { current: initial }; }, useMemo: fn => fn(), useCallback: fn => fn };
}
function screen(initial = {}) {
  const react = hooks(), pushes = [], state = { projects: [], isLoading: false, error: null, reload: () => { state.reloads++; }, reloads: 0, ...initial };
  const components = Object.fromEntries(['Button', 'Card', 'EmptyState', 'ErrorState', 'Input', 'Spinner'].map(name => ['@/components/common/' + name, { [name]: name }]));
  const module = compile('screens/LibraryScreen.tsx', { ...components, react, 'expo-router': { router: { push: path => pushes.push(path) } }, '@expo/vector-icons/MaterialCommunityIcons': { __esModule: true, default: 'Icon' }, '@/theme/tokens': tokens, '@/features/results/libraryPresentation': model, '@/features/results/useLibrary': { useLibrary: () => state } });
  return { ...module, state, pushes, render: () => { react.begin(); return module.LibraryScreen(); } };
}

test('eligibility and RESULT target match actual Web across status/artifact/source/processing combinations', () => {
  for (const status of ['COMPLETED', 'FAILED', 'TRANSLATED', 'PROCESSING_VIDEO'])
    for (const mediaType of ['VIDEO', 'AUDIO', null]) for (const state of ['COMPLETED', 'PROCESSING', 'READY'])
      for (const source of ['RESULT', 'NARRATION', 'TRANSLATION', 'JOB']) for (const ready of [true, false]) {
        const record = fixture('p', { status }); Object.assign(record.workflow, { mediaType, state, targetLanguage: { code: 'EN', source }, artifact: { resultReady: ready, narrationReady: ready } });
        assert.deepEqual(plain(model.libraryProduct(record)), plain(web.libraryProduct(record)));
      }
  for (const patch of [{ workflow: undefined }, { progress: 100, status: 'TRANSLATING' }]) assert.equal(model.libraryProduct(fixture('x', patch)), null);
  for (const processing of [{ jobId: 'mock', status: 'PROCESSING' }, { jobId: 'mock', status: 'QUEUED' }]) {
    const p = fixture(); p.workflow.processing = processing; assert.equal(model.libraryProduct(p), null);
  }
});

test('missing/wrong artifact, invalid language and earlier workflow never become library products', () => {
  for (const code of ['', 'x', 'en/injection', ' en ', 'zh-CN', 'bad code']) {
    const p = fixture(); p.workflow.targetLanguage.code = code;
    assert.deepEqual(plain(model.libraryProduct(p)), plain(web.libraryProduct(p)));
  }
  for (const step of ['UPLOAD', 'TRANSCRIPT', 'TRANSLATION', 'VOICE', 'GENERATE', 'UNKNOWN']) {
    const p = fixture(); p.workflow.step = step; assert.equal(model.libraryProduct(p), null);
  }
  const p = fixture(); p.workflow.artifact.resultReady = false;
  p.mediaType = 'VIDEO'; p.fileUrl = '/not-evidence.mp4'; assert.equal(model.libraryProduct(p), null);
});

test('search/media/language and encoded result paths are identical to Web', () => {
  const audio = fixture('audio'); Object.assign(audio.workflow, { mediaType: 'AUDIO', targetLanguage: { code: 'ko', source: 'NARRATION' }, artifact: { narrationReady: true, resultReady: false } });
  const products = [fixture('a/b'), audio].map(model.libraryProduct);
  for (const query of ['', ' BẢO ', 'không có']) for (const media of ['ALL', 'VIDEO', 'AUDIO']) for (const language of ['ALL', 'en', 'ko']) {
    assert.deepEqual(plain(model.filterLibrary(products, { query, media, language })), plain(web.filterLibrary(products, { query, media, language })));
  }
  assert.equal(products[0].path, '/projects/a%2Fb/result?language=en');
});

test('all API pages are read before display; missing/changed pages or duplicates fail closed', async () => {
  const all = Array.from({ length: 205 }, (_, i) => fixture(String(i))), calls = [];
  const load = async ({ page, limit }, signal) => { assert.equal(signal.aborted, false); calls.push(page); return { projects: all.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: 205, totalPages: 3 } }; };
  const loaded = await loader.loadCompleteProjectList(load, new AbortController().signal);
  assert.equal(loaded.length, 205); assert.deepEqual(calls, [1, 2, 3]);
  for (const defect of ['missing', 'duplicate', 'changed']) {
    await assert.rejects(loader.loadCompleteProjectList(async input => {
      const response = await load(input, new AbortController().signal);
      if (input.page === 3 && defect === 'missing') response.projects = [];
      if (input.page === 3 && defect === 'duplicate') response.projects[0] = all[0];
      if (input.page === 3 && defect === 'changed') response.pagination.total++;
      return response;
    }, new AbortController().signal), /PROJECT_LIST_(INCOMPLETE|CHANGED)/);
  }
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(loader.loadCompleteProjectList(load, cancelled.signal), /CANCELLED/);
});

test('loading, error and empty are distinct; retry is the GET reload callback', () => {
  const loading = screen({ isLoading: true, projects: [fixture()] }).render();
  assert.equal(loading.props.data.length, 0); assert.equal(loading.props.ListEmptyComponent, undefined);
  assert.ok(nodes(loading).some(n => n.type === 'Spinner'));
  const s = screen({ error: 'Mất kết nối', projects: [fixture()] }), error = s.render();
  assert.equal(error.props.data.length, 0); assert.equal(error.props.ListEmptyComponent, undefined);
  nodes(error).find(n => n.type === 'ErrorState').props.onRetry(); assert.equal(s.state.reloads, 1); assert.equal(s.pushes.length, 0);
  const empty = screen(), tree = empty.render();
  assert.equal(nodes(tree).find(n => n.type === 'EmptyState').props.title, 'Chưa có sản phẩm thuyết minh.');
  nodes(nodes(tree).find(n => n.type === 'EmptyState').props.action).find(n => n.type === 'Button').props.onPress();
  assert.equal(empty.pushes[0], '/projects/new');
});

test('draft filters apply only on search and reset pagination; pages contain12 products as Web', () => {
  const s = screen({ projects: Array.from({ length: 25 }, (_, i) => fixture(String(i))) });
  let tree = s.render(); assert.equal(tree.props.data.length, 12);
  nodes(tree).find(n => n.type === 'Button' && n.props.children === 'Trang sau').props.onPress();
  tree = s.render(); assert.equal(tree.props.data[0].project.id, '12');
  nodes(tree).find(n => n.type === 'Input').props.onChangeText('Bảo tàng 24');
  tree = s.render(); assert.equal(tree.props.data.length, 12, 'draft is not applied');
  nodes(tree).find(n => n.type === 'Button' && n.props.children === 'Tìm kiếm').props.onPress();
  tree = s.render(); assert.equal(tree.props.data.length, 1); assert.equal(tree.props.data[0].project.id, '24'); assert.equal(tree.props.ListFooterComponent, undefined);
});

test('unverified completed projects show notice; invalid rows never render as completed cards', () => {
  const s = screen({ projects: [fixture('not-ready', { workflow: undefined }), fixture('processing', { status: 'TRANSLATING' })] });
  const tree = s.render(); assert.equal(tree.props.data.length, 0);
  assert.ok(nodes(tree).some(n => String(n.props.children).includes('Dữ liệu chưa đầy đủ.')));
});

test('product card has verified metadata, icon fallback and only existing result navigation action', () => {
  const s = screen(), item = model.libraryProduct(fixture());
  const tree = s.LibraryProductCard({ item }), controls = nodes(tree).filter(n => n.type === 'Button');
  assert.equal(controls.length, 1); assert.equal(controls[0].props.children, 'Xem thuyết minh');
  controls[0].props.onPress(); assert.deepEqual(plain(s.pushes[0]), { pathname: '/projects/[projectId]/result', params: { projectId: 'one', language: 'en' } });
  assert.ok(nodes(tree).some(n => n.type === 'Icon' && n.props.name === 'video-outline'));
  assert.equal(nodes(tree).some(n => ['VideoView', 'Image', 'Audio'].includes(n.type)), false);
});

test('mobile choices wrap at360/393,48dp targets and list layout does not overlay bottom navigation', () => {
  const s = screen({ projects: [fixture()] }), tree = s.render();
  const choiceNode = nodes(tree).find(n => typeof n.type === 'function' && n.props.label === 'Loại phương tiện');
  const choices = choiceNode.type(choiceNode.props);
  for (const control of nodes(choices).filter(n => n.type === 'Pressable')) {
    const style = Object.assign({}, ...control.props.style({ pressed: false }).filter(Boolean));
    assert.ok(style.minHeight >= 48); assert.equal(style.maxWidth, '100%');
    assert.equal(control.props.accessibilityRole, 'radio');
  }
  for (const width of [360, 393]) assert.ok(width - tree.props.contentContainerStyle.padding * 2 > 0);
  assert.equal(tree.props.contentContainerStyle.position, undefined); assert.equal(tree.props.horizontal, undefined);
});

test('session changes and superseded GETs cannot expose old-account products', async () => {
  const react = hooks(), deferred = []; let revision = 1, focus, status = 'authenticated';
  const module = compile('features/results/useLibrary.ts', {
    react: { ...react, useSyncExternalStore: (_subscribe, snapshot) => snapshot() },
    'expo-router': { useFocusEffect: callback => { focus = callback; } },
    '@/lib/api': { session: { getRevision: () => revision, getAuthStatus: () => status, subscribe: () => () => {} } },
    '../projects/projectRepository': { projectRepository: { listPage: () => {} } },
    '../projects/projectListData': { loadCompleteProjectList: (_page, signal) => new Promise(resolve => deferred.push({ resolve, signal })) },
  });
  const render = () => { react.begin(); return module.useLibrary(); };
  render(); const cleanup = focus(); assert.equal(deferred.length, 1);
  revision = 2; deferred[0].resolve([fixture('other-account')]); await new Promise(resolve => setImmediate(resolve));
  assert.equal(render().projects.length, 0);
  let state = render(); const request = state.reload();
  deferred[1].resolve([fixture('current-account')]); await request;
  assert.equal(render().projects[0].id, 'current-account');
  revision = 3; assert.equal(render().projects.length, 0);
  cleanup(); assert.equal(deferred[1].signal.aborted, true);
  status = 'unauthenticated'; render(); focus(); assert.equal(deferred.length, 2);
});

test('library route is protected by existing tab group and keeps legacy history unchanged; no AI/mutation or media-download dependencies', () => {
  for (const file of ['screens/LibraryScreen.tsx', 'features/results/useLibrary.ts', 'features/results/libraryPresentation.ts', 'app/(tabs)/library.tsx']) {
    assert.doesNotMatch(read('../src/' + file), /fetch\(|downloadProtected|shareAsync|generateContent|translationService|processingService|method:\s*['"](?:POST|PATCH|DELETE)/);
  }
  assert.match(read('../src/app/_layout.tsx'), /Stack.Protected guard=\{guards.private\}/);
  assert.match(read('../src/app/(tabs)/_layout.tsx'), /name="library"/);
  assert.match(read('../src/app/(tabs)/_layout.tsx'), /name="history" options=\{\{ href: null/);
  assert.match(read('../src/app/(tabs)/history.tsx'), /HistoryScreen/);
  assert.doesNotMatch(read('../src/screens/HistoryScreen.tsx'), /libraryProduct/);
});

test('library uses authenticated repository GETs and preserves server workflow without constructing media URLs', async () => {
  const calls = [], record = fixture();
  class ApiError extends Error {}
  const repository = compile('features/projects/projectRepository.ts', {
    '../../lib/api': { ApiError, api: async (path, options) => {
      calls.push([path, options]);
      if (path.startsWith('/projects?')) return { projects: [record], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } };
      if (path.endsWith('/media')) return { media: { originalName: 'source.mp4', mediaType: 'VIDEO', fileSize: 10 } };
      if (path.endsWith('/translations')) return { translations: [] };
      assert.fail('Unexpected artifact/download/write request');
    } },
    './projectEditing.mjs': { mergeUpdatedProject: () => assert.fail('No updates') },
  }).projectRepository;
  // The VM intentionally has no fetch, storage or network access.
  const projects = await loader.loadCompleteProjectList(repository.listPage, new AbortController().signal);
  assert.deepEqual(plain(projects[0].workflow), record.workflow);
  assert.ok(model.libraryProduct(projects[0]));
  assert.equal(calls.length, 3);
  assert.ok(calls.every(([, options]) => !options.method && options.signal instanceof AbortSignal));
  assert.doesNotMatch(calls.map(([path]) => path).join(','), /results|narrations|download|generate/);
});

test('401/403 ownership failures propagate instead of becoming an empty or partial library', async () => {
  for (const status of [401, 403]) {
    const forbidden = Object.assign(new Error('Test-only access denied'), { status });
    await assert.rejects(loader.loadCompleteProjectList(async () => { throw forbidden; }, new AbortController().signal), error => error === forbidden);
  }
  const s = screen({ projects: Array.from({ length: 25 }, (_, i) => fixture(String(i))) });
  nodes(s.render()).find(n => n.type === 'Button' && n.props.children === 'Trang sau').props.onPress();
  nodes(s.render()).find(n => n.type === 'Button' && n.props.children === 'Trang sau').props.onPress();
  const last = s.render(); assert.equal(last.props.data.length, 1);
  assert.equal(nodes(last).find(n => n.type === 'Button' && n.props.children === 'Trang sau').props.disabled, true);
});
