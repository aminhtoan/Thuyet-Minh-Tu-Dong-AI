import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { translationTargetChoices, translationLanguageLabel } from '../src/features/translation/translationLanguages.mjs';
const source = await readFile(new URL('../src/features/translation/useTranslationEditor.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const transcript = { id: 'transcript', projectId: 'project', languageCode: 'vi', status: 'SAVED', updatedAt: 'revision', segments: [{ id: 'source', text: 'Xin chào', sequence: 1, startTime: 0, endTime: 2 }] };
const saved = { id: 'translation', projectId: 'project', targetLanguage: 'en', sourceLanguage: 'vi', sourceRevision: 'revision', segments: [{ id: 'translated', transcriptSegmentId: 'source', translatedText: 'Hello', sequence: 1, startTime: 0, endTime: 2 }] };
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
function harness(service, catalog = async () => [{ code: 'en' }, { code: 'ja' }]) {
  let state, cursor = 0, effect; const refs = [], exports = {};
  const react = {
    useReducer(reducer, initial) { state ??= initial; return [state, patch => { state = reducer(state, patch); }]; },
    useRef(initial) { const index = cursor++; return refs[index] ??= { current: initial }; },
    useCallback: fn => fn,
    useEffect: fn => { effect ??= fn; },
  };
  runInNewContext(compiled, { exports, Error, AbortController, DOMException, require: name => {
    if (name === 'react') return react;
    if (name.includes('transcriptService')) return { transcriptService: { async getTranscript() { return transcript; } } };
    if (name.includes('voiceService')) return { voiceService: { getLanguages: catalog } };
    if (name.includes('translationLanguages')) return { translationTargetChoices };
    if (name.includes('translationService')) return { translationService: service };
    if (name.includes('translationUtils')) return { copyTranslation: value => structuredClone(value), hasTranslationChanges: () => false, validateTranslation: () => ({}) };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return { render(preferred = '') { cursor = 0; return exports.useTranslationEditor('project', preferred); }, mount() { return effect(); } };
}
test('no default target or POST on mount; choosing English loads only that saved target', async () => {
  const requested = []; const h = harness({ async get(_project, target) { requested.push(target); return null; }, async translate() { assert.fail('Must not auto translate'); } });
  h.render(); const cleanup = h.mount(); await flush();
  assert.equal(h.render().targetLanguage, null); assert.equal(requested.length, 0);
  h.render().changeTarget('en'); await flush(); assert.deepEqual(requested, ['en']); assert.equal(h.render().targetLanguage, 'en');
  cleanup();
});
test('preferred saved target restores without generation', async () => {
  const h = harness({ async get() { return saved; }, async translate() { assert.fail('Must not regenerate'); } }); h.render('en'); const cleanup = h.mount(); await flush();
  assert.equal(h.render('en').status, 'SAVED'); assert.equal(h.render('en').draft.segments[0].translatedText, 'Hello'); cleanup();
});
test('double tap starts one operation, presents loading then saved success and preserves original', async () => {
  const before = JSON.stringify(transcript); let calls = 0, finish;
  const h = harness({ async get() { return null; }, translate() { calls++; return new Promise(resolve => { finish = resolve; }); } });
  h.render('en'); const cleanup = h.mount(); await flush(); const editor = h.render('en');
  const first = editor.translate(), second = editor.translate(); assert.equal(calls, 1); assert.equal(h.render('en').status, 'TRANSLATING');
  finish(saved); await Promise.all([first, second]); assert.equal(h.render('en').status, 'SAVED'); assert.equal(JSON.stringify(transcript), before); cleanup();
});
test('confirmation cancellation returns waiting without false failure; provider errors remain visible', async () => {
  for (const reason of [new DOMException('Đã hủy', 'AbortError'), new Error('Dịch vụ dịch đã hết hạn mức.')]) {
    const h = harness({ async get() { return null; }, async translate() { throw reason; } }); h.render('en'); const cleanup = h.mount(); await flush(); await h.render('en').translate();
    const state = h.render('en'); assert.equal(state.status, reason.name === 'AbortError' ? 'NOT_STARTED' : 'FAILED'); assert.equal(state.draft, null); if (reason.name !== 'AbortError') assert.equal(state.error, reason.message); cleanup();
  }
});
test('Translation UI keeps placeholder, target guard, loading, saved feedback and mapped-only voice continuation', async () => {
  const page = await readFile(new URL('../src/pages/TranslationPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /Chọn ngôn ngữ cần dịch/); assert.match(page, /disabled=\{!canMutate \|\| !editor.targetLanguage \|\| editor.busy/);
  assert.match(page, /Đang dịch bằng AI\.\.\./); assert.match(page, /Chưa có bản dịch cho ngôn ngữ đã chọn/);
  assert.match(page, /Bản dịch đã được lưu trên máy chủ/); assert.match(page, /Boolean\(presentation.notice\)/);
});

test('real catalog projection excludes Vietnamese, keeps English/Japanese/Korean/Chinese/French without static allowlist', () => {
  const languages = ['vi', 'en', 'ja', 'ko', 'zh', 'fr'].map(code => ({ code, name: code, nativeName: code }));
  const before = JSON.stringify(languages);
  assert.deepEqual(translationTargetChoices(languages, ' VI ').map(language => language.code), ['en', 'ja', 'ko', 'zh', 'fr']);
  assert.equal(JSON.stringify(languages), before);
  assert.match(translationLanguageLabel({ code: 'en', name: 'English', nativeName: 'English' }), /Anh/);
  assert.deepEqual(translationTargetChoices([{ code: ' EN ' }, { code: 'en' }, { code: 'bad code' }], 'vi').map(language => language.code), ['en']);
});
test('empty API catalog and source-only catalog stay explicit EMPTY with no selected target or generation', async () => {
  for (const catalog of [[], [{ code: 'vi' }]]) {
    const h = harness({ async get() { assert.fail('No saved target should be requested'); }, async translate() { assert.fail('No generation'); } }, async () => catalog);
    h.render('en'); const cleanup = h.mount(); await flush(); const state = h.render('en');
    assert.equal(state.languageStatus, 'EMPTY'); assert.equal(state.targetChoices.length, 0); assert.equal(state.targetLanguage, null); assert.equal(state.canChangeTarget, false); await state.translate(); cleanup();
  }
});
test('catalog network failure is visible and explicit retry reloads only catalog/GETs', async () => {
  let fails = true, gets = 0;
  const h = harness({ async get() { gets++; return null; }, async translate() { assert.fail('No generation'); } }, async () => { if (fails) throw new Error('network'); return [{ code: 'vi' }, { code: 'en' }]; });
  h.render(); const cleanup = h.mount(); await flush(); let state = h.render();
  assert.equal(state.languageStatus, 'ERROR'); assert.match(state.error, /Không thể tải danh sách ngôn ngữ/); assert.equal(state.canChangeTarget, false);
  fails = false; state.retry(); await flush(); state = h.render(); assert.equal(state.languageStatus, 'READY');
  state.changeTarget('en'); await flush(); assert.equal(h.render().targetLanguage, 'en'); assert.equal(h.render().busy, false); assert.equal(gets, 1); cleanup();
});
test('catalog loading and server-supported French selection work without touching transcript or paid actions', async () => {
  let complete; const before = JSON.stringify(transcript);
  const h = harness({ async get() { return null; }, async translate() { assert.fail('Must not translate on selection'); } }, () => new Promise(resolve => { complete = resolve; }));
  h.render(); const cleanup = h.mount(); await flush(); assert.equal(h.render().languageStatus, 'LOADING'); assert.equal(h.render().canChangeTarget, false);
  complete([{ code: 'vi' }, { code: 'fr' }]); await flush(); let state = h.render();
  assert.equal(state.languageStatus, 'READY'); state.changeTarget('unsupported'); assert.equal(h.render().targetLanguage, null);
  state.changeTarget('fr'); await flush(); // A fresh catalog request is resolved explicitly, no POST.
  complete([{ code: 'vi' }, { code: 'fr' }]); await flush(); state = h.render(); assert.equal(state.targetLanguage, 'fr'); assert.equal(state.busy, false); assert.equal(JSON.stringify(transcript), before); cleanup();
});
test('language UI exposes empty/error/loading help and no longer gates catalog values with static isLanguageCode', async () => {
  const page = await readFile(new URL('../src/pages/TranslationPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /Chưa có ngôn ngữ đích được cấu hình/); assert.match(page, /Đang tải danh sách ngôn ngữ/); assert.match(page, /translation-language-status/);
  assert.doesNotMatch(page, /isLanguageCode/); assert.match(page, /onChange=\{\(event\) => editor.changeTarget\(event.target.value\)\}/);
});
