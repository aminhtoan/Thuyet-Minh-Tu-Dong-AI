import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as contract from '../src/features/museum/publicAudio.mjs';
import * as web from '../../frontend-web/src/features/results/publicAudioOptions.mjs';
const require = createRequire(import.meta.url);
const projectId = 'a'.repeat(24), originalId = 'b'.repeat(24), narrationId = 'c'.repeat(24);
const base = 'http://127.0.0.1:8080/api';
const options = [
  { optionId: `original:${originalId}`, type: 'ORIGINAL_AUDIO', projectId, code: 'vi', name: 'Tiếng Việt', audioUrl: `/api/published-original-audio/${originalId}/audio` },
  { optionId: `narration:${narrationId}`, type: 'AI_NARRATION', projectId, code: 'vi', name: 'Tiếng Việt', audioUrl: `/api/projects/public-audio/${projectId}/${narrationId}` },
  { optionId: 'narration:english', type: 'AI_NARRATION', projectId, code: 'en', name: 'Tiếng Anh', audioUrl: `/api/projects/public-audio/${projectId}/${narrationId}` },
];
const guides = [{ key: 'public-guide', title: 'Fixture', languages: options }];
test('original/AI names and same-language option identities match Web exactly', () => {
  for (const option of options) {
    assert.equal(contract.publicAudioOptionKey(option), web.publicAudioOptionKey(option));
    assert.equal(contract.publicAudioOptionLabel(option), web.publicAudioOptionLabel(option));
    assert.ok(contract.publicAudioUrl(option, base));
  }
  assert.equal(new Set(options.map(contract.publicAudioOptionKey)).size, 3);
  const parsed = contract.parsePublicGuides({ success: true, data: { guides } });
  assert.equal(parsed[0].languages.length, 3);
  assert.throws(() => contract.parsePublicGuides({ success: true, data: { guides: [{ ...guides[0], languages: [options[0], options[0]] }] } }));
});
test('public-only URLs reject protected/source/external/malformed paths', () => {
  for (const audioUrl of [`/api/projects/${projectId}/narrations/${narrationId}/audio`, `/api/projects/public-audio/${projectId}/source`,
    'https://external.test/api/published-original-audio/' + originalId + '/audio', 'javascript:alert(1)', '',
    `/api/published-original-audio/${originalId}/audio?token=secret`]) assert.equal(contract.publicAudioUrl({ ...options[0], audioUrl }, base), null);
});
test('listing fetch uses only public API; errors/empty do not request alternatives', async () => {
  const calls = [], signal = new AbortController().signal;
  const fetcher = async (url, init) => { calls.push([url, init]); return { ok: true, json: async () => ({ success: true, data: { guides: [] } }) }; };
  assert.deepEqual(await contract.fetchPublicGuides(base, signal, fetcher), []);
  assert.equal(calls[0][0], base + '/projects/public-audio-guides');
  assert.equal(calls[0][1].headers, undefined);
  await assert.rejects(contract.fetchPublicGuides(base, signal, async () => ({ ok: false, status: 404 })));
  await assert.rejects(contract.fetchPublicGuides(base, signal, async () => { throw Error('offline'); }));
  assert.throws(() => contract.parsePublicGuides({ success: false }));
});

const source = readFileSync(new URL('../src/features/museum/PublicAudioSection.tsx', import.meta.url), 'utf8');
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const value = find(child, predicate); if (value) return value; }
  return null;
};
function harness(component, overrides = {}) {
  let cursor = 0, tree, focusCleanup;
  const slots = [], effects = [], cleanups = [], timers = new Map(); let timerId = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => v === b[i]);
  const React = { ...require('react'), useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = value; }]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i], deps)) { slots[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); } } };
  const playerStatus = { isLoaded: false, playing: false, error: null, didJustFinish: false, ...overrides.status };
  let plays = 0, pauses = 0;
  const player = { play() { plays++; }, pause() { pauses++; }, seekTo: overrides.seekTo ?? (async () => {}) };
  const exports = {};
  const modules = {
    react: React, 'react-native': { Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: x => x } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useFocusEffect(fn) { const i = cursor++; if (slots[i] !== fn) { slots[i] = fn; effects.push(() => { focusCleanup?.(); focusCleanup = fn(); }); } } },
    'expo-audio': { useAudioPlayer: () => player, useAudioPlayerStatus: () => playerStatus },
    '@expo/vector-icons/MaterialCommunityIcons': { default: 'Icon' }, '../../config/env': { env: { apiBaseUrl: base } },
    '../../services/analyticsService': { trackListen: async () => {} }, './theme': { ms: {}, museum: { white: '#fff' } },
    './publicAudio.mjs': { ...contract, fetchPublicGuides: overrides.fetchGuides ?? (async () => guides) },
  };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(code, { exports, AbortController, setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); },
    require: key => { if (key in modules) return modules[key]; if (key === 'react/jsx-runtime') return require(key); throw Error('Unexpected dependency ' + key); } });
  const render = () => { cursor = 0; tree = exports[component](component === 'PublicAudioPlayer' ? { option: options[0] } : {}); return tree; };
  return { render, flush() { effects.splice(0).forEach(fn => fn()); }, find: predicate => find(tree, predicate), playerStatus,
    get plays() { return plays; }, get pauses() { return pauses; }, blur() { focusCleanup?.(); }, timeout() { [...timers.values()].forEach(fn => fn()); },
    unmount() { focusCleanup?.(); cleanups.forEach(fn => fn?.()); }, get playerComponent() { return exports.PublicAudioPlayer; } };
}
test('player waits for native load, never autoplays, handles timeout/error and pauses on disposal', async () => {
  const h = harness('PublicAudioPlayer'); h.render(); h.flush();
  assert.equal(h.plays, 0);
  assert.equal(h.find(node => node.props?.accessibilityRole === 'button').props.disabled, true);
  h.playerStatus.isLoaded = true; h.render(); h.flush();
  const button = h.find(node => node.props?.accessibilityRole === 'button');
  button.props.onPress(); assert.equal(h.plays, 1);
  h.playerStatus.error = 'native network error'; h.render();
  assert.ok(h.find(node => node.props?.accessibilityRole === 'alert'));
  h.unmount(); assert.equal(h.pauses, 1);
  const slow = harness('PublicAudioPlayer'); slow.render(); slow.flush(); slow.timeout(); slow.render();
  assert.ok(slow.find(node => node.props?.accessibilityRole === 'alert')); slow.unmount();
});
test('late seek completion after disposal cannot start playback', async () => {
  let resolve;
  const h = harness('PublicAudioPlayer', { status: { isLoaded: true, didJustFinish: true }, seekTo: () => new Promise(done => { resolve = done; }) });
  h.render(); h.flush(); h.find(node => node.props?.accessibilityRole === 'button').props.onPress();
  h.unmount(); resolve(); await new Promise(done => setImmediate(done)); assert.equal(h.plays, 0);
});
test('modal selects by option ID and unmounts player on switch, close and navigation blur', async () => {
  const h = harness('PublicAudioSection'); h.render(); h.flush(); await new Promise(done => setImmediate(done)); h.render();
  h.find(node => node.props?.accessibilityLabel === 'Mở âm thanh Fixture').props.onPress(); h.render();
  const first = h.find(node => node.type === h.playerComponent); assert.ok(first.key.includes(options[0].optionId));
  h.find(node => node.props?.accessibilityLabel === 'Thuyết minh AI — Tiếng Việt').props.onPress(); h.render();
  const second = h.find(node => node.type === h.playerComponent); assert.notEqual(first.key, second.key);
  h.find(node => node.type === 'Modal').props.onRequestClose(); h.render(); assert.equal(h.find(node => node.type === h.playerComponent), null);
  h.find(node => node.props?.accessibilityLabel === 'Mở âm thanh Fixture').props.onPress(); h.render(); h.blur(); h.render();
  assert.equal(h.find(node => node.type === 'Modal'), null); h.unmount();
});
test('listing completion after blur is ignored and public API failure has a retry state', async () => {
  let finish;
  const h = harness('PublicAudioSection', { fetchGuides: () => new Promise(resolve => { finish = resolve; }) });
  h.render(); h.flush(); h.blur(); finish(guides); await new Promise(done => setImmediate(done)); h.render();
  assert.equal(h.find(node => node.props?.accessibilityLabel === 'Mở âm thanh Fixture'), null); h.unmount();
  const fail = harness('PublicAudioSection', { fetchGuides: async () => { throw Error('404'); } });
  fail.render(); fail.flush(); await new Promise(done => setImmediate(done)); fail.render();
  assert.ok(fail.find(node => node.props?.accessibilityRole === 'alert')); fail.unmount();
});
