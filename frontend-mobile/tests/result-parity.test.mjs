import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const jsx = (type, props) => ({ type, props });
const native = { Text: 'Text', View: 'View', Pressable: 'Pressable', StyleSheet: { create: value => value } };
function compileSource(source, imports = {}) {
  const exports = {}, modules = { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native, ...imports };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, AbortController, URL, require: name => { assert.ok(name in modules, `Unmocked dependency ${name}`); return modules[name]; } });
  return exports;
}
const compile = (file, imports) => compileSource(read('../src/' + file), imports);
const access = compile('features/results/resultAccess.ts'), media = compile('features/results/resultMedia.ts');
const tokens = compile('theme/tokens.ts');
const web = compileSource(read('../../frontend-web/src/features/projects/workflowRouteGuard.ts'));
const plain = value => JSON.parse(JSON.stringify(value));
const id = '000000000000000000000001';
const project = () => ({ id, name: 'Dự án test cách ly', sourceLanguage: 'vi', status: 'COMPLETED', progress: 100, workflow: { step: 'RESULT', state: 'COMPLETED', mediaType: 'VIDEO', canResume: false, processing: null, targetLanguage: { code: 'th', source: 'RESULT' }, artifact: { resultReady: true, narrationReady: false } } });
const artifact = () => ({ id: 'artifact', projectId: id, artifactType: 'VIDEO', mediaType: 'VIDEO', languageCode: 'th', filePath: `/api/projects/${id}/results/artifact/file`, mimeType: 'video/mp4', fileSize: 100, createdAt: '2026-10-24T08:00:00Z' });
const nodes = n => !n || typeof n !== 'object' ? [] : [n, ...[n.props?.children].flat(Infinity).flatMap(nodes)];
function hooks() { const values = []; let cursor = 0; const cleanups = []; return { begin: () => { cursor = 0; }, cleanups, useState: value => { const i = cursor++; if (!(i in values)) values[i] = value; return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; }, useRef: value => { const i = cursor++; return values[i] ??= { current: value }; }, useCallback: fn => fn, useEffect: fn => { cleanups.push(fn()); } }; }

test('RESULT access matches actual Web guard, including missing evidence, processing and source confirmation', () => {
  for (const step of ['UNKNOWN', 'TRANSCRIPT', 'VOICE', 'GENERATE', 'RESULT']) for (const state of ['READY', 'PROCESSING', 'FAILED', 'BLOCKED', 'COMPLETED']) for (const mediaType of ['VIDEO', 'AUDIO', null]) for (const ready of [false, true]) for (const code of ['th', 'zh-CN', ' EN ', '', 'bad/path']) {
    const w = project().workflow; Object.assign(w, { step, state, mediaType, artifact: { resultReady: ready, narrationReady: ready }, targetLanguage: { code, source: 'RESULT' } });
    for (const requested of [null, 'TH', 'en', 'bad/path']) {
      const expected = web.resolveWorkflowRouteAccess(w, 'RESULT', requested), actual = access.resultAccess(w, requested);
      assert.equal(actual.allowed, expected.allowed);
      if (actual.allowed) assert.equal(actual.targetLanguage, expected.targetLanguage);
      else assert.equal(actual.reason, expected.reason);
    }
  }
  assert.equal(access.resultAccess(undefined).allowed, false);
  const w = project().workflow; w.targetLanguage = null; assert.equal(access.resultAccess(w).allowed, false);
});

test('result languages normalize like Web without expanding the translation/TTS catalog', () => {
  for (const code of ['vi', 'en', 'ja', 'ko', 'th', 'zh-CN', 'fr', ' xx ', '', 'x', 'en_US', null]) assert.equal(access.normalizeResultLanguage(code), web.normalizeCatalogLanguageCode(code));
  const w = project().workflow; w.targetLanguage.code = 'zh-cn';
  assert.equal(access.resultAccess(w, 'ZH-CN').allowed, true);
  assert.equal(access.resultAccess(w, 'en').allowed, false);
  const webLanguages = compileSource(read('../../frontend-web/src/features/projects/languages.ts'));
  for (const code of ['th', 'zh-cn', 'xx', 'en', 'vi']) assert.equal(access.resultLanguageName(code), webLanguages.languageDisplayName(code));
});

test('protected URL must match project, artifact and type; never forwards auth to absolute/external URLs', () => {
  assert.equal(media.protectedResultUrl('https://test.invalid/api', artifact()), `https://test.invalid/api/projects/${id}/results/artifact/file`);
  for (const filePath of ['https://evil.invalid/file', '//evil.invalid', '/api/projects/other/results/artifact/file', `/api/projects/${id}/results/wrong/file`, `/api/projects/${id}/narrations/artifact/audio`, `/api/projects/${id}/results/artifact/file?token=x`]) assert.throws(() => media.protectedResultUrl('https://test.invalid/api', { ...artifact(), filePath }), /PATH_INVALID/);
});

function resultHook(options = {}) {
  const react = hooks(); let focus, revision = 1, artifactCalls = 0, downloads = 0;
  const module = compile('features/results/useResult.ts', { react: { ...react, useSyncExternalStore: (_subscribe, snapshot) => snapshot() },
    'expo-router': { useFocusEffect: fn => { focus = fn; } },
    '@/config/env': { env: { apiBaseUrl: 'https://test.invalid/api' } },
    '@/lib/api': { api: options.api ?? (async () => ({ project: options.project ?? project() })), session: { getRevision: () => revision, subscribe: () => () => {}, get: async () => ({ accessToken: 'test-only-not-a-real-key' }) } },
    './resultAccess': access, './resultMedia': media,
    './resultService': { resultService: { getByProjectId: async (...args) => { artifactCalls++; return options.getArtifact ? options.getArtifact(...args) : artifact(); }, downloadProtected: () => { downloads++; assert.fail('No download on mount'); } } },
  });
  const render = (language = 'th', projectId = id) => { react.begin(); return module.useResult(projectId, language); };
  return { render, focus: () => focus(), revision: value => { revision = value; }, calls: () => artifactCalls, downloads: () => downloads };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('fresh authenticated project GET precedes artifact fetch and streaming source; no eager download', async () => {
  const h = resultHook(); h.render(); h.focus(); await settle();
  const state = h.render(); assert.equal(state.loading, false); assert.equal(state.result.languageCode, 'th');
  assert.ok(state.source.headers.Authorization.startsWith('Bearer ')); assert.equal(h.calls(), 1); assert.equal(h.downloads(), 0);
});

test('unfinished/processing/artifact-missing or language mismatch never calls artifact APIs', async () => {
  for (const problem of ['processing', 'artifact', 'language', 'step']) {
    const p = project();
    if (problem === 'processing') p.workflow.state = 'PROCESSING';
    if (problem === 'artifact') p.workflow.artifact.resultReady = false;
    if (problem === 'language') p.workflow.targetLanguage = null;
    if (problem === 'step') { p.workflow.step = 'TRANSLATION'; p.status = 'TRANSLATING'; }
    const h = resultHook({ project: p }); h.render(); h.focus(); await settle();
    assert.ok(h.render().blocked); assert.equal(h.calls(), 0);
  }
  const mismatch = resultHook(); mismatch.render('en'); mismatch.focus(); await settle(); assert.equal(mismatch.calls(), 0);
});

test('401/403, invalid project and returned project mismatch fail closed before artifact access', async () => {
  for (const status of [401, 403, 404]) {
    const h = resultHook({ api: async () => { throw Object.assign(new Error('fixture'), { status }); } }); h.render(); h.focus(); await settle(); assert.ok(h.render().error); assert.equal(h.calls(), 0);
  }
  const h = resultHook({ project: { ...project(), id: 'another' } }); h.render(); h.focus(); await settle(); assert.ok(h.render().error); assert.equal(h.calls(), 0);
  const invalid = resultHook(); invalid.render('th', '../bad'); invalid.focus(); await settle(); assert.equal(invalid.calls(), 0);
});

test('missing artifact stays empty; wrong language/project/path errors never expose a player', async () => {
  for (const value of [null, { ...artifact(), languageCode: 'en' }, { ...artifact(), projectId: 'other' }, { ...artifact(), filePath: 'https://outside.invalid' }]) {
    const h = resultHook({ getArtifact: async () => value }); h.render(); h.focus(); await settle(); const state = h.render();
    assert.equal(state.source, null); assert.equal(state.result, null); assert.equal(Boolean(state.error), value !== null);
  }
});

test('blur, project change and session changes reject late source/metadata; cleanup aborts request', async () => {
  let resolve; const h = resultHook({ getArtifact: () => new Promise(done => { resolve = done; }) });
  h.render(); const cleanup = h.focus(); await settle(); cleanup(); resolve(artifact()); await settle(); assert.equal(h.render().source, null);
  const s = resultHook(); s.render(); s.focus(); await settle(); assert.ok(s.render().source);
  s.revision(2); assert.equal(s.render().source, null); assert.equal(s.render().project, null);
  assert.equal(s.render('th', '000000000000000000000002').source, null);
});

function playerSetup(status = {}) {
  const react = hooks(), calls = [], player = { status: 'loading', volume: 1, play: () => calls.push('play'), pause: () => calls.push('pause'), seekTo: async n => calls.push(['seek', n]), addListener: (_name, fn) => { player.statusListener = fn; return { remove: () => calls.push('remove') }; } };
  const audioStatus = { isLoaded: true, isBuffering: false, currentTime: 10, duration: 60, playing: false, error: null, ...status };
  const module = compile('features/results/ResultPlayer.tsx', { react,
    'expo-audio': { useAudioPlayer: (_source, options) => { assert.equal(options.downloadFirst, false); return player; }, useAudioPlayerStatus: () => audioStatus },
    'expo-video': { useVideoPlayer: () => player, VideoView: 'VideoView' }, '@/components/common/Button': { Button: 'Button' }, '@/components/common/Spinner': { Spinner: 'Spinner' }, '@/theme/tokens': tokens,
  });
  return { module, calls, player, react, source: { uri: 'https://test.invalid/protected', headers: { Authorization: 'test-fixture' } } };
}
test('video keeps native controls16:9/contain, loading/error feedback and removes event listeners', () => {
  const p = playerSetup(); const tree = p.module.ResultVideo({ source: p.source });
  const video = nodes(tree).find(n => n.type === 'VideoView');
  assert.equal(video.props.nativeControls, true); assert.equal(video.props.contentFit, 'contain'); assert.equal(video.props.style.aspectRatio, 16 / 9);
  assert.equal(video.props.fullscreenOptions.enable, true); assert.equal(p.calls.length, 0);
  p.player.statusListener({ status: 'error' }); p.react.begin();
  assert.ok(nodes(p.module.ResultVideo({ source: p.source })).some(n => n.props.accessibilityRole === 'alert'));
  p.react.cleanups.forEach(fn => fn?.()); assert.ok(p.calls.includes('remove'));
});
test('audio exposes explicit play/pause, bounded seek and volume; handles empty/error without autoplay', async () => {
  const p = playerSetup(), tree = p.module.ResultAudio({ source: p.source }); assert.equal(p.calls.length, 0);
  await nodes(tree).find(n => n.type === 'Button' && n.props.children === 'Phát âm thanh').props.onPress(); assert.ok(p.calls.includes('play'));
  const seek = nodes(tree).find(n => n.props.accessibilityRole === 'adjustable'); await seek.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }); assert.deepEqual(p.calls.at(-1), ['seek', 0]);
  nodes(tree).find(n => n.type === 'Button' && n.props.children === 'Giảm âm').props.onPress(); assert.equal(p.player.volume, 0.75);
  const failed = playerSetup({ error: 'private raw native error' });
  const failedTree = failed.module.ResultAudio({ source: failed.source }); assert.ok(nodes(failedTree).some(n => n.props.accessibilityRole === 'alert')); assert.equal(JSON.stringify(failedTree).includes('private raw'), false);
});

function screenSetup(state) {
  const react = hooks(), calls = [], resultService = { downloadProtected: async () => { calls.push('download'); return 'file://isolated-fixture'; }, cleanup: async () => calls.push('cleanup') };
  const components = Object.fromEntries(['Button', 'Badge', 'Card', 'ErrorState', 'Spinner', 'WorkflowSteps'].map(name => ['@/components/common/' + name, { [name]: name }]));
  const module = compile('screens/ResultScreen.tsx', { ...components, react, 'expo-router': { router: { replace: path => calls.push(path) } },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async () => calls.push('save-sheet') }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '@/components/layout/MobileHeader': { MobileHeader: 'MobileHeader' }, '@/components/layout/MobileScreen': { MobileScreen: 'MobileScreen' }, '@/features/results/useResult': { useResult: () => state }, '@/features/results/ResultPlayer': { ResultPlayer: 'ResultPlayer' }, '@/features/results/resultUtils': { resultRows: () => [] }, '@/features/results/resultService': { resultService }, '@/lib/api': { session: { getRevision: () => 1 } }, '@/theme/tokens': tokens });
  return { ...module, calls };
}
test('result UI keeps Web section/actions; blocked and empty states never link to generate or show players', () => {
  for (const state of [{ blocked: 'not-ready' }, { result: null }, { loading: true }, { error: 'GET failed' }]) {
    const s = screenSetup(state), tree = s.ResultScreen({ projectId: id });
    assert.equal(nodes(tree).some(n => n.type === 'ResultPlayer'), false);
    assert.equal(JSON.stringify(tree).includes('Tiếp tục xử lý'), false);
    const back = nodes(tree).find(n => n.type === 'Button' && n.props.children === 'Xem thư viện'); back.props.onPress(); assert.equal(s.calls.at(-1), '/library');
  }
  const s = screenSetup({ project: project(), result: artifact(), source: {} });
  assert.ok(nodes(s.ResultScreen({ projectId: id })).some(n => n.type === 'ResultPlayer'));
});
test('manual download alone opens native save sheet, prevents duplicate press and cleans cache', async () => {
  const s = screenSetup({}), tree = s.ResultDownload({ result: artifact() }); assert.equal(s.calls.length, 0);
  const button = nodes(tree).find(n => n.type === 'Button'); const first = button.props.onPress(); await button.props.onPress(); await first;
  assert.deepEqual(s.calls, ['download', 'save-sheet', 'cleanup']);
});
test('result source uses no AI endpoints and existing protected route/group/nav remain intact', () => {
  for (const file of ['screens/ResultScreen.tsx', 'features/results/useResult.ts', 'features/results/ResultPlayer.tsx']) assert.doesNotMatch(read('../src/' + file), /generateContent|translationService|processingService|router\.(push|replace)\([^\n]*generate|method:\s*['"]POST/);
  assert.match(read('../src/app/_layout.tsx'), /Stack.Protected guard=\{guards.private\}/);
  assert.match(read('../src/components/layout/CustomerBottomNavigation.tsx'), /route: 'library'/);
});

function serviceSetup({ status = 200, results = [], narrations = [] } = {}) {
  const calls = [], removed = [];
  const service = compile('features/results/resultService.ts', {
    'expo-file-system/legacy': { cacheDirectory: 'file://isolated-cache/', downloadAsync: async (url, destination, options) => { calls.push({ url, destination, options }); return { status, uri: destination }; }, deleteAsync: async uri => removed.push(uri) },
    '../../config/env': { env: { apiBaseUrl: 'https://test.invalid/api' } },
    '../../lib/api': { api: async path => path.endsWith('/results') ? { results } : { narrations }, refreshSession: () => assert.fail('No refresh on403'), session: { get: async () => ({ accessToken: 'isolated-fixture' }) } },
    '../projects/projectRepository': { projectRepository: { getAll: () => [] } }, './resultMedia': media,
  }).resultService;
  return { service, calls, removed };
}
test('artifact selector follows Web exact confirmed-language filter and newest-video preference, no English fallback', async () => {
  const row = { id: 'old', targetLanguage: 'th', createdAt: '2026-10-01', fileUrl: '/old' };
  const s = serviceSetup({ results: [row, { ...row, id: 'new', createdAt: '2026-10-24' }, { ...row, id: 'other', targetLanguage: 'en', createdAt: '2026-10-25' }] });
  assert.equal((await s.service.getByProjectId(id, 'th')).id, 'new');
  assert.equal(await s.service.getByProjectId(id, 'zh-cn'), null); assert.equal(s.calls.length, 0);
});
test('manual protected download sends auth only to validated path;403 removes partial cache and never retries', async () => {
  const s = serviceSetup({ status: 403 });
  await assert.rejects(s.service.downloadProtected(artifact()), /HTTP 403/);
  assert.equal(s.calls.length, 1); assert.ok(s.removed.length >= 1);
  assert.equal(s.calls[0].options.headers.Authorization, 'Bearer isolated-fixture');
  await assert.rejects(s.service.downloadProtected({ ...artifact(), filePath: 'https://outside.invalid/file' }), /PATH_INVALID/);
  assert.equal(s.calls.length, 1);
});
