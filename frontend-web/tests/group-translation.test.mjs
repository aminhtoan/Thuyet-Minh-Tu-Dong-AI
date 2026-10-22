import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { customerAttemptMessage } from '../src/features/translation/customerAttemptPresentation.mjs';
const source = await readFile(new URL('../src/features/translation/GroupTranslationWorkspace.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const groups = [{ groupId: 'a', sequence: 1, sourceSegmentIds: ['s1'], sourceText: 'Trường Tiểu học', translatedText: '', startTime: .8, endTime: 2 }, { groupId: 'b', sequence: 2, sourceSegmentIds: ['s2'], sourceText: 'ở tỉnh Vĩnh Long.', translatedText: '', startTime: 2, endTime: 3 }];
const plan = { projectId: 'project', sourceLanguage: 'vi', targetLanguage: 'en', sourceRevision: 'revision', groupingVersion: 'phrase-candidates-v1', groups, sourceSegmentCount: 2 };
const draft = { ...plan, state: 'DRAFT', alignmentFormat: 'GROUPS_V1', draftId: 'draft-id', outputDigest: 'digest', expiresAt: '2099-01-01T00:00:00Z', groups: groups.map(g => ({ ...g, translatedText: 'English text for ' + g.groupId })) };
const saved = { ...draft, state: 'APPROVED', id: 'saved', fullText: 'English text', review: { method: 'MANUAL_V1' } };
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
function harness({ target = 'en', initialDraft = false, stored = null, restored = draft, confirm = true, catalog = [{ code: 'en', name: 'Tiếng Anh' }], preview = async () => draft, approve = async () => saved, customerMode = false, customerState = async () => ({ draft: null, attempt: null }) } = {}) {
  const slots = [], refs = [], effects = []; let cursor = 0, refCursor = 0, effectCursor = 0, params = new URLSearchParams(initialDraft ? 'draft=draft-id' : ''), requests = 0, approvals = 0, restores = 0, fetches = 0, confirmCalls = 0;
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { return refs[refCursor++] ??= { current: initial }; },
    useEffect(action, deps) { const i = effectCursor++, old = effects[i]; if (!old || deps.some((v, j) => v !== old.deps[j])) { old?.cleanup?.(); effects[i] = { deps, action }; } },
  };
  const service = {
    async saved() { fetches++; return stored; }, async plan() { return structuredClone(plan); },
    async draft() { restores++; return structuredClone(restored); },
    async customerState() { fetches++; return customerState(); },
    async customerGenerate(...args) { requests++; return preview(...args); },
    async preview(...args) { requests++; return preview(...args); }, async approve(...args) { approvals++; return approve(...args); },
  };
  const exports = {};
  runInNewContext(compiled, { exports, Error, Date, URLSearchParams, AbortController, crypto: { randomUUID: () => 'request-key' }, window: { confirm() { confirmCalls++; return confirm; } }, require: name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react-router-dom') return { Link: 'a', useSearchParams: () => [params, value => { params = value; }] };
    if (name.includes('groupTranslationService')) return { groupTranslationService: service };
    if (name.includes('customerAttemptPresentation')) return { customerAttemptMessage };
    if (name.includes('voiceService')) return { voiceService: { async getLanguages() { return catalog; } } };
    if (name.includes('projectRepository')) return { projectRepository: { async refresh() {} } };
    if (name.includes('transcriptService')) return { transcriptService: { async getTranscript() { return { segments: [], languageCode: 'vi' }; } } };
    if (name.includes('transcriptPresentation')) return { formatPreciseTimestamp: s => '00:00.' + s };
    if (name.includes('translationLanguages')) return { translationTargetChoices: (list, source) => list.filter(l => l.code !== source), translationLanguageLabel: l => l.name };
    if (name.includes('translationPresentation')) return { buildTranslationPresentation: () => ({ rows: [] }), mapTranslationSegments: () => [] };
    const component = name.split('/').at(-1); return { [component]: component };
  } });
  let tree;
  return {
    render() { cursor = 0; refCursor = 0; effectCursor = 0; tree = exports.GroupTranslationWorkspace({ project: { id: 'project', name: 'Dự án thật', sourceLanguage: 'vi' }, preferredTarget: target, canMutate: true, notice: null, customerMode }); for (const effect of effects) if (effect.action) { const fn = effect.action; effect.action = null; effect.cleanup = fn(); } return tree; },
    async settle() { this.render(); await flush(); this.render(); },
    find(predicate) { function walk(value) { if (!value || typeof value !== 'object') return null; if (predicate(value)) return value; for (const child of [value.props?.children].flat(Infinity)) { const match = walk(child); if (match) return match; } return null; } return walk(tree); },
    text() { function walk(value) { if (typeof value === 'string') return value; if (!value || typeof value !== 'object') return ''; return [value.props?.children].flat(Infinity).map(walk).join(' '); } return walk(tree); },
    counts: () => ({ requests, approvals, restores, fetches, confirmCalls }),
    unmount() { effects.forEach(e => e.cleanup?.()); },
  };
}
const button = (h, label) => h.find(v => v.type === 'Button' && v.props.children === label);
test('Customer refresh observes durable states, blocks generation and only checks GET results', async () => {
  for (const status of ['NOT_SENT', 'PROCESSING', 'UNCERTAIN', 'FAILED_PRE_DISPATCH', 'FAILED_RESPONSE', 'EXPIRED']) {
    const h = harness({ customerMode: true, customerState: async () => ({ draft: null, attempt: { status } }) });
    await h.settle(); assert.match(h.text(), new RegExp(customerAttemptMessage({ status }).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(button(h, 'Dịch tiếng Anh'), null); assert.equal(h.counts().requests, 0);
    button(h, 'Kiểm tra kết quả (không gọi AI)').props.onClick(); await h.settle();
    assert.equal(h.counts().requests, 0); assert.equal(h.counts().approvals, 0); h.unmount();
  }
});
test('Customer explicit click submits once, shows durable draft and never auto-approves', async () => {
  let finish; const h = harness({ customerMode: true, preview: () => new Promise(resolve => { finish = resolve; }) });
  await h.settle(); assert.equal(h.counts().requests, 0);
  h.find(v => v.type === 'input').props.onChange({ target: { checked: true } }); h.render();
  const send = button(h, 'Dịch tiếng Anh').props.onClick; const a = send(), b = send();
  assert.equal(h.counts().requests, 1); finish(draft); await Promise.all([a, b]); await h.settle();
  assert.match(h.text(), /Bản nháp đã lưu trên máy chủ/); assert.equal(h.counts().approvals, 0); h.unmount();
});
test('Customer timeout is uncertain; read-only refresh can recover saved draft without resubmitting', async () => {
  let result = { draft: null, attempt: null };
  const h = harness({ customerMode: true, customerState: async () => result, preview: async () => { throw Error('Timeout'); } });
  await h.settle(); h.find(v => v.type === 'input').props.onChange({ target: { checked: true } }); h.render();
  await button(h, 'Dịch tiếng Anh').props.onClick(); h.render(); assert.match(h.text(), /Không nhấn Dịch lại/);
  assert.ok(button(h, 'Dịch tiếng Anh').props.disabled);
  result = { draft, attempt: { status: 'DRAFT_SAVED' } };
  button(h, 'Kiểm tra kết quả (không gọi AI)').props.onClick(); await h.settle();
  assert.match(h.text(), /Bản nháp đã lưu trên máy chủ/); assert.equal(h.counts().requests, 1); assert.equal(h.counts().approvals, 0); h.unmount();
});
test('group UI mounting/loading/empty catalog never auto-generates; source language excluded', async () => {
  const h = harness({ target: '', catalog: [{ code: 'vi' }, { code: 'en' }] });
  h.render(); assert.match(h.text(), /Đang tải/); await h.settle();
  assert.equal(h.find(v => v.type === 'select').props.children[1].length, 1); assert.equal(h.counts().requests, 0); h.unmount();
  const empty = harness({ catalog: [] }); await empty.settle(); assert.match(empty.text(), /Chưa có ngôn ngữ đích/); assert.equal(empty.counts().requests, 0); empty.unmount();
});
test('plan merge preserves ordered source membership; review reset; cancellation sends zero requests', async () => {
  const h = harness({ confirm: false }); await h.settle();
  assert.ok(button(h, 'Xem trước bản dịch').props.disabled);
  button(h, 'Gộp với cụm tiếp theo').props.onClick(); h.render();
  assert.match(h.text(), /Trường Tiểu học ở tỉnh Vĩnh Long/);
  h.find(v => v.type === 'input').props.onChange({ target: { checked: true } }); h.render();
  await button(h, 'Xem trước bản dịch').props.onClick(); assert.equal(h.counts().requests, 0); assert.equal(h.counts().confirmCalls, 1); h.unmount();
});
test('preview double submit one call; draft is not saved and cannot continue to Voice', async () => {
  let finish;
  const h = harness({ preview: () => new Promise(resolve => { finish = resolve; }) }); await h.settle();
  h.find(v => v.type === 'input').props.onChange({ target: { checked: true } }); h.render();
  const action = button(h, 'Xem trước bản dịch').props.onClick;
  const a = action(), b = action(); assert.equal(h.counts().requests, 1); h.render(); assert.match(h.text(), /Đang tạo bản dịch nháp/);
  finish(draft); await Promise.all([a, b]); await h.settle();
  assert.match(h.text(), /Bản nháp — chưa lưu/); assert.equal(h.find(v => v.type === 'a' && String(v.props.to).includes('/voice')), null);
  assert.ok(button(h, 'Duyệt và lưu bản dịch').props.disabled); assert.equal(h.counts().approvals, 0); h.unmount();
});
test('manual approval double tap one save, confirmed response shows saved and Voice continuation', async () => {
  let finish;
  const h = harness({ approve: () => new Promise(resolve => { finish = resolve; }) }); await h.settle();
  h.find(v => v.type === 'input').props.onChange({ target: { checked: true } }); h.render(); await button(h, 'Xem trước bản dịch').props.onClick(); await h.settle();
  h.find(v => v.type === 'input').props.onChange({ target: { checked: true } }); h.render();
  const action = button(h, 'Duyệt và lưu bản dịch').props.onClick; const a = action(), b = action(); assert.equal(h.counts().approvals, 1);
  finish(saved); await Promise.all([a, b]); h.render(); assert.match(h.text(), /Bản dịch đã lưu/); assert.ok(h.find(v => v.type === 'a' && String(v.props.to).includes('/voice'))); h.unmount();
});
test('preview errors stay visible; read-only retry does not generate', async () => {
  const h = harness({ preview: async () => { throw new Error('Hết hạn mức. Không tự động gọi lại AI.'); } }); await h.settle();
  h.find(v => v.type === 'input').props.onChange({ target: { checked: true } }); h.render(); await button(h, 'Xem trước bản dịch').props.onClick(); h.render();
  assert.match(h.text(), /Hết hạn mức/); button(h, 'Tải lại dữ liệu (không gọi AI)').props.onClick(); await h.settle(); assert.equal(h.counts().requests, 1); h.unmount();
});
test('approval source mismatch retains draft and blocks saved feedback', async () => {
  const h = harness({ approve: async () => { throw new Error('Bản ghi nguồn đã thay đổi.'); } }); await h.settle();
  h.find(v => v.type === 'input').props.onChange({ target: { checked: true } }); h.render(); await button(h, 'Xem trước bản dịch').props.onClick(); await h.settle();
  h.find(v => v.type === 'input').props.onChange({ target: { checked: true } }); h.render(); await button(h, 'Duyệt và lưu bản dịch').props.onClick(); h.render();
  assert.match(h.text(), /Bản ghi nguồn đã thay đổi/); assert.match(h.text(), /Bản nháp — chưa lưu/); assert.equal(h.find(v => v.type === 'a' && String(v.props.to).includes('/voice')), null); h.unmount();
});
test('format-aware saved group loads without generation or regrouping', async () => {
  const h = harness({ stored: saved }); await h.settle(); assert.match(h.text(), /English text for a/); assert.match(h.text(), /Bản dịch đã lưu/); assert.equal(h.counts().requests, 0); assert.equal(button(h, 'Gộp với cụm tiếp theo'), null); h.unmount();
});
test('reload restores RAM draft by ID without generation; rejected draft never persists', async () => {
  const h = harness({ initialDraft: true }); await h.settle(); assert.equal(h.counts().restores, 1); assert.equal(h.counts().requests, 0);
  assert.match(h.text(), /Bản nháp — chưa lưu/); button(h, 'Từ chối bản nháp').props.onClick(); await h.settle();
  assert.equal(h.counts().approvals, 0); assert.equal(h.counts().requests, 0); assert.match(h.text(), /Kiểm tra ranh giới cụm nguồn/); h.unmount();
});
test('expired restored draft cannot submit approval or silently regenerate', async () => {
  const h = harness({ initialDraft: true, restored: { ...draft, expiresAt: '2000-01-01T00:00:00Z' } }); await h.settle();
  h.find(v => v.type === 'input').props.onChange({ target: { checked: true } }); h.render(); await button(h, 'Duyệt và lưu bản dịch').props.onClick(); h.render();
  assert.match(h.text(), /Bản nháp đã hết hạn/); assert.equal(h.counts().approvals, 0); assert.equal(h.counts().requests, 0); h.unmount();
});
test('actual group API client sends memberships/digest only; GET uses format negotiation', async () => {
  const content = await readFile(new URL('../src/features/translation/groupTranslationService.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(content, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const requests = [], exports = {};
  runInNewContext(js, { exports, require: () => ({ ApiError: class extends Error {}, async api(path, options) { requests.push({ path, body: options?.body ? JSON.parse(options.body) : null }); return { translation: saved, draft, plan }; } }) });
  const service = exports.groupTranslationService;
  await service.saved('project', 'en'); assert.match(requests[0].path, /format=groups-v1/);
  await service.preview('project', plan, groups, 'key'); assert.deepEqual(requests[1].body.groups, [['s1'], ['s2']]); assert.equal(requests[1].body.groups[0].sourceText, undefined);
  await service.approve('project', draft); assert.deepEqual(requests[2].body, { outputDigest: 'digest', reviewed: true });
});
test('feature flag remains explicit OFF, legacy branch intact and TTS consumes groups without fake segments', async () => {
  const page = await readFile(new URL('../src/pages/TranslationPage.tsx', import.meta.url), 'utf8');
  const example = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  assert.match(page, /VITE_GROUP_TRANSLATION_ENABLED === 'true'/); assert.match(example, /VITE_GROUP_TRANSLATION_ENABLED=false/);
  assert.match(page, /TranslationSourcePreflight key=\{project.id \+ preferredTarget\}/); assert.match(page, /<TranslationWorkspace project=\{project\}/); assert.match(source, /sourceSegmentIds/); assert.match(source, /formatPreciseTimestamp\(g.startTime\)/);
  const voice = await readFile(new URL('../src/features/voice/voiceUtils.ts', import.meta.url), 'utf8'); assert.match(voice, /'groups' in translation \? translation.groups : translation.segments/);
});
