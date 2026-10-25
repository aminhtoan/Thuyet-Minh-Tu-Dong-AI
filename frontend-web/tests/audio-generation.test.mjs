import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
function load(file, dependencies = {}, suffix = '') {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(file, root), 'utf8') + suffix, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(source, { exports, require: name => { if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`); return dependencies[name]; }, Date, console });
  return exports;
}
const guard = load('features/projects/workflowRouteGuard.ts');
const { generationReadiness } = load('features/processing/generationReadiness.ts', { '../projects/workflowRouteGuard': guard });
const utils = load('features/processing/processingUtils.ts');
function context(mediaType = 'AUDIO', step = 'RESULT') {
  return { project: { id: 'test-only', name: 'Synthetic fixture', status: step === 'RESULT' ? 'COMPLETED' : 'GENERATING_AUDIO', mediaType,
    workflow: { step, state: step === 'RESULT' ? 'COMPLETED' : 'READY', canResume: true, mediaType, targetLanguage: { code: 'en', source: 'NARRATION' }, processing: null, failure: null, artifact: { narrationReady: true, resultReady: step === 'RESULT' && mediaType === 'VIDEO' } } },
  config: { projectId: 'test-only', translationId: 'translation', languageCode: 'en', voiceId: 'voice', speed: 1, translationRevision: 'rev', narrationId: 'narration' },
  transcript: { languageCode: 'vi', segments: [] }, translation: { targetLanguage: 'en', groups: [] }, voice: { name: 'Alloy' } };
}
function sessionHarness(initial, latest = initial) {
  let posts = 0, reads = 0, finish; const updates = [];
  const { processingService } = load('features/processing/processingService.ts', {
    '../../lib/api': { api: async (_path, options, retry) => { posts++; assert.equal(options.method, 'POST'); assert.equal(retry, false); return new Promise(resolve => { finish = () => resolve({ result: { id: 'result' }, idempotent: false }); }); } },
    '../projects/projectRepository': { projectRepository: { refresh: async () => {} } }, './processingUtils': utils,
    './generationService': { generationService: { getContext: async () => { reads++; return latest; } } }, './generationReadiness': { generationReadiness },
  });
  return { session: processingService.createSession(initial, s => updates.push(s)), updates, posts: () => posts, reads: () => reads, finish: () => finish() };
}

test('AUDIO ready narration + verified RESULT initializes completed without a new operation', async () => {
  const h = sessionHarness(context()); assert.equal(h.session.getStatus().status, 'COMPLETED');
  assert.equal(h.session.getStatus().stages.find(s => s.id === 'media').status, 'COMPLETED');
  await h.session.start(); await h.session.retry(); assert.equal(h.posts(), 0); assert.equal(h.reads(), 0);
});
test('AUDIO TTS completed alone or locally pending cannot invent a Result', async () => {
  const c = context('AUDIO', 'GENERATE'); const h = sessionHarness(c);
  assert.equal(generationReadiness(c).canStart, false); assert.equal(h.session.getStatus().status, 'WAITING');
  await h.session.start(); assert.equal(h.posts(), 0); assert.equal(h.session.getStatus().status, 'FAILED');
});
test('VIDEO narration ready still requires its existing video processing POST; duplicate clicks dispatch once', async () => {
  const h = sessionHarness(context('VIDEO', 'GENERATE'));
  assert.equal(generationReadiness(context('VIDEO', 'GENERATE')).canStart, true);
  const first = h.session.start(), second = h.session.start(); await second;
  assert.equal(h.posts(), 1); h.finish(); await first; assert.equal(h.session.getStatus().status, 'COMPLETED');
});
test('missing artifact, active jobs, UNKNOWN and mismatched language block processing', async () => {
  for (const mutate of [c => { c.config.narrationId = undefined; }, c => { c.project.workflow.processing = { status: 'PROCESSING' }; }, c => { c.project.workflow.step = 'UNKNOWN'; c.project.workflow.state = 'BLOCKED'; }, c => { c.project.workflow.targetLanguage.code = 'th'; }]) {
    const c = context('VIDEO', 'GENERATE'); mutate(c); const h = sessionHarness(c);
    assert.equal(generationReadiness(c).canStart, false); await h.session.start(); assert.equal(h.posts(), 0);
  }
  const c = context(); c.project.workflow.artifact.narrationReady = false;
  assert.equal(generationReadiness(c).resultReady, false);
});
test('fresh workflow supersedes stale GENERATE context without creating a job', async () => {
  const h = sessionHarness(context('VIDEO', 'GENERATE'), context('VIDEO'));
  await h.session.start(); assert.equal(h.session.getStatus().status, 'COMPLETED'); assert.equal(h.posts(), 0);
});

function workspace(c, confirmed, canMutate) {
  const h = sessionHarness(c), navigate = []; const jsx = (type, props) => ({ type, props: props ?? {} });
  const deps = { react: { useEffect() {}, useState: () => [confirmed, () => {}] }, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'react-router-dom': { Link: 'Link', useNavigate: () => path => navigate.push(path), useParams() {}, useSearchParams() {} },
    '../features/processing/generationReadiness': { generationReadiness },
    '../features/processing/processingUtils': utils,
    '../features/processing/useProcessing': { useProcessing: () => ({ context: c, snapshot: h.session.getStatus(), busy: false, loadStatus: 'READY', start: h.session.start }) },
    '../features/projects/languages': { languageDisplayName: v => v }, '../features/projects/projectUtils': { languageNames: { vi: 'Tiếng Việt' } },
    '../features/voice/voiceUtils': { formatSpeed: () => '1.0x' }, '../utils/displayLabels': { getDisplayStatus: v => v }, '../localization/statusLabels.mjs': { processingStatusLabels: {} },
    '../styles/processing.css': {}, '../features/projects/workflowRouteGuard': guard, '../features/projects/useProjects': {},
  };
  for (const name of ['Badge', 'Button', 'Card', 'EmptyState', 'ErrorState', 'ProgressBar', 'Spinner', 'WorkflowSteps']) deps[`../components/common/${name}`] = { [name]: name };
  deps['../components/common/WorkflowRouteGuard'] = { WorkflowReadOnlyNotice: 'Notice', WorkflowRouteRecovery: 'Recovery' };
  deps['../components/layout/PageHeader'] = { PageHeader: 'Header' }; deps['../features/processing/ProcessingStage'] = { ProcessingStage: 'Stage' };
  const page = load('pages/GeneratePage.tsx', deps, '\nexports.workspace = GenerateWorkspace;');
  const tree = page.workspace({ project: c.project, language: 'en', canMutate, notice: canMutate ? null : 'Chỉ đọc' });
  const nodes = []; function walk(v) { if (Array.isArray(v)) return v.forEach(walk); if (!v || typeof v !== 'object') return; nodes.push(v); walk(v.props?.children); } walk(tree);
  return { nodes, navigate, posts: h.posts };
}
test('actual Generate workspace shows Xem kết quả for AUDIO, not a disabled create button', () => {
  const h = workspace(context(), true, false);
  assert.equal(h.nodes.some(v => v.type === 'Button' && v.props.children === 'Tạo âm thanh'), false);
  const view = h.nodes.find(v => v.type === 'Button' && v.props.children === 'Xem kết quả'); assert.ok(view);
  view.props.onClick(); assert.equal(h.navigate[0], '/projects/test-only/result?language=en'); assert.equal(h.posts(), 0);
});
test('confirmation and workflow mutation guards still control the VIDEO create button', () => {
  for (const [confirmed, canMutate, disabled] of [[false, true, true], [true, false, true], [true, true, false]]) {
    const h = workspace(context('VIDEO', 'GENERATE'), confirmed, canMutate);
    assert.equal(h.nodes.find(v => v.type === 'Button' && v.props.children === 'Tạo video').props.disabled, disabled);
  }
});
test('generation context reloads current Backend workflow; missing/UNCERTAIN translation never produces a generation context', async () => {
  const current = context(); let reads = 0, missing = false;
  const { generationService } = load('features/processing/generationService.ts', {
    '../projects/projectRepository': { projectRepository: { getById: () => { throw Error('stale cache forbidden'); }, getProject: async () => { reads++; return current.project; } } },
    '../transcript/transcriptService': { transcriptService: { getTranscript: async () => current.transcript } },
    '../translation/translationService': { translationService: { getSavedTranslation: async () => missing ? null : current.translation } },
    '../voice/narrationService': { narrationService: { getConfig: async () => current.config } },
    '../voice/voiceService': { voiceService: { getVoice: async () => current.voice } },
    '../translation/translationUtils': { transcriptRevision: () => 'rev' },
    '../voice/voiceUtils': { translationRevision: () => 'rev', validateNarrationConfig: () => null },
  });
  assert.equal((await generationService.getContext('test-only', 'en')).project.workflow.step, 'RESULT');
  missing = true; assert.equal(await generationService.getContext('test-only', 'en'), null);
  assert.equal(reads, 2);
});
