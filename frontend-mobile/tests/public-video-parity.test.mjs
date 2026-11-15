import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as contract from '../src/features/museum/publicVideo.mjs';
const require = createRequire(import.meta.url);
const base = 'http://127.0.0.1:8080/api', projectId = 'a'.repeat(24), id = 'b'.repeat(24);
const video = { id, projectId, title: 'Dự án demo', languageCode: 'en', duration: 28, artifactType: 'VIDEO', sourceMediaType: 'VIDEO', mimeType: 'video/mp4',
  fileUrl: `/api/published-video-narrations/public/projects/${projectId}/results/${id}/file` };
const envelope = videos => ({ success: true, data: { videos } });
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
function compile(source, overrides, globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, require: key => overrides[key] ?? require(key), AbortController, setTimeout, clearTimeout, ...globals });
  return exports;
}
const web = compile(read('../../frontend-web/src/features/museum/publishedVideos.ts'), { '../../config/env': { env: { apiBaseUrl: base } } }, { URL, window: { location: { origin: 'http://127.0.0.1:5173' } } });
const settle = () => new Promise(resolve => setImmediate(resolve));
const allowed = async () => ({ ok: true, headers: new Headers({ 'content-type': 'video/mp4' }) });
function nativePlayer(replace) {
  const listeners = new Map(), sources = []; let plays = 0, pauses = 0;
  return { status: 'idle', sources, get plays() { return plays; }, get pauses() { return pauses; },
    play() { plays++; }, pause() { pauses++; },
    async replaceAsync(source) { sources.push(source); if (replace) await replace(source); },
    addListener(event, callback) { listeners.set(event, callback); return { remove: () => listeners.delete(event) }; },
    emit(status) { this.status = status; listeners.get('statusChange')?.({ status }); },
  };
}
test('Web/Mobile parse the same public MP4s, identities, languages and empty state', () => {
  const second = { ...video, id: 'c'.repeat(24), languageCode: 'vi', fileUrl: video.fileUrl.replace(id, 'c'.repeat(24)) };
  for (const videos of [[], [video, second], [video, { ...second, languageCode: 'en' }], [video, video]]) {
    assert.equal(JSON.stringify(contract.parsePublishedVideos(envelope(videos), base)), JSON.stringify(web.parsePublishedVideos(envelope(videos))));
  }
  for (const code of ['vi', 'en', 'th', 'ko', 'zh-CN', 'ja', 'fr']) assert.equal(contract.publishedVideoLanguage(code), web.publishedVideoLanguage(code));
  for (const candidate of [{ ...video, id: [id] }, { ...video, projectId: [projectId] }]) {
    assert.equal(contract.parsePublishedVideos(envelope([candidate]), base).length, 0);
    assert.equal(web.parsePublishedVideos(envelope([candidate])).length, 0);
  }
});
test('public-only URL parity rejects protected Result, source, foreign origin, wrong project and tokens', () => {
  for (const fileUrl of [video.fileUrl, `/api/projects/${projectId}/results/${id}/file`, `/api/projects/${projectId}/source`,
    `https://other.test${video.fileUrl}`, `${video.fileUrl}?token=secret`, video.fileUrl.replace(projectId, 'd'.repeat(24))]) {
    const item = { ...video, fileUrl };
    assert.equal(contract.publicVideoUrl(item, base), web.publicVideoUrl(item));
  }
});
test('listing is public only, no cache or credentials, and failure never falls back', async () => {
  const calls = [], signal = new AbortController().signal;
  const videos = await contract.fetchPublishedVideos(base, signal, async (...args) => { calls.push(args); return { ok: true, json: async () => envelope([video]) }; });
  assert.equal(videos[0].id, id); assert.equal(calls[0][0], `${base}/published-video-narrations/public`);
  assert.equal(calls[0][1].cache, 'no-store'); assert.equal(calls[0][1].credentials, 'omit');
  await assert.rejects(contract.fetchPublishedVideos(base, signal, async () => ({ ok: false })));
  assert.throws(() => contract.parsePublishedVideos({ success: true, data: { results: [video] } }, base));
});
test('native load starts paused, disables caching, reports readiness and releases source', async () => {
  const player = nativePlayer(), states = [], controller = new AbortController();
  const dispose = contract.loadPublicVideo(player, video, base, controller.signal, state => states.push(state), allowed);
  await settle(); assert.equal(player.plays, 0); assert.equal(player.sources[0].useCaching, false);
  assert.equal(player.sources[0].uri, `http://127.0.0.1:8080${video.fileUrl}`);
  player.emit('readyToPlay'); assert.equal(states.at(-1), 'READY');
  controller.abort(); assert.equal(player.sources.at(-1), null); assert.ok(player.pauses > 0);
  player.emit('error'); assert.equal(states.at(-1), 'READY'); dispose();
});
test('revoked 403/404 or HTML response never reaches native source and has no retry/fallback', async () => {
  for (const response of [{ ok: false, status: 403 }, { ok: false, status: 404 }, { ok: true, headers: new Headers({ 'content-type': 'text/html' }) }]) {
    const player = nativePlayer(), states = []; let calls = 0;
    contract.loadPublicVideo(player, video, base, new AbortController().signal, state => states.push(state), async () => { calls++; return response; });
    await settle(); assert.equal(states.at(-1), 'ERROR'); assert.equal(calls, 1); assert.ok(player.sources.every(source => source === null));
  }
});
test('playback failure unloads video and ignores later ready events', async () => {
  const player = nativePlayer(), states = [];
  contract.loadPublicVideo(player, video, base, new AbortController().signal, state => states.push(state), allowed);
  await settle(); player.emit('error'); player.emit('readyToPlay');
  assert.equal(states.at(-1), 'ERROR'); assert.equal(player.sources.at(-1), null); assert.equal(player.plays, 0);
});
test('blur/unmount during HEAD or async native replacement cannot start or retain video', async () => {
  let finish;
  const pendingHead = new Promise(resolve => { finish = resolve; });
  const first = nativePlayer(), signal = new AbortController();
  contract.loadPublicVideo(first, video, base, signal.signal, () => {}, () => pendingHead);
  signal.abort(); finish(await allowed()); await settle(); assert.ok(first.sources.every(source => source === null));
  let complete;
  const player = nativePlayer(source => source ? new Promise(resolve => { complete = resolve; }) : Promise.resolve());
  const controller = new AbortController();
  contract.loadPublicVideo(player, video, base, controller.signal, () => {}, allowed);
  await settle(); controller.abort(); complete(); await settle();
  assert.equal(player.sources.at(-1), null); assert.equal(player.plays, 0);
});
test('loading timeout reaches ERROR and clears native media', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const states = [], player = nativePlayer();
  contract.loadPublicVideo(player, video, base, new AbortController().signal, state => states.push(state), () => new Promise(() => {}));
  t.mock.timers.tick(15001); assert.equal(states.at(-1), 'ERROR'); assert.equal(player.sources.at(-1), null);
});
function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map(item => find(item, predicate)).find(Boolean);
  if (!tree || typeof tree !== 'object') return undefined;
  return predicate(tree) ? tree : find(tree.props?.children, predicate);
}
function harness(videos = [video], failure = false) {
  let cursor = 0, tree;
  let responseVideos = videos, responseFailure = failure;
  const slots = [], effects = [], cleanups = [];
  const react = { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, n) => d !== slots[i].deps[n])) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, n) => d !== slots[i][n])) { slots[i] = deps; effects.push(fn); } } };
  const { PublicVideoSection } = compile(read('../src/features/museum/PublicVideoSection.tsx'), { react,
    'react-native': { Pressable: 'button', View: 'div', Text: 'span', StyleSheet: { create: v => v } },
    'expo-router': { useFocusEffect: fn => react.useEffect(fn, [fn]) }, 'expo-video': {},
    '../../config/env': { env: { apiBaseUrl: base } }, './theme': { ms: {}, museum: {} },
    './publicVideo.mjs': { ...contract, fetchPublishedVideos: async () => { if (responseFailure) throw Error('offline'); return typeof responseVideos === 'function' ? responseVideos() : responseVideos; } },
  });
  const render = () => { cursor = 0; tree = PublicVideoSection(); return tree; };
  return { render, async settle() { render(); effects.splice(0).forEach(fn => { const clean = fn(); if (clean) cleanups.push(clean); }); await settle(); return render(); },
    find: fn => find(tree, fn), blur: () => cleanups.forEach(fn => fn()),
    setResponse(value, failed = false) { responseVideos = value; responseFailure = failed; },
    refresh() { const button = find(tree, node => node.type === 'button' && find(node.props.children, child => child.props?.children === 'Tải lại danh sách video')); assert.ok(button); return button.props.onPress; } };
}
test('section lists Result/language, opens only on click, and unmounts playback on blur', async () => {
  const h = harness(); await h.settle();
  assert.equal(h.find(node => node.props?.video), undefined);
  h.find(node => node.props?.accessibilityLabel?.startsWith('Xem video')).props.onPress(); h.render();
  assert.equal(h.find(node => node.props?.video).key, id);
  h.blur(); h.render(); assert.equal(h.find(node => node.props?.video), undefined);
});
test('section exposes distinct empty and error states', async () => {
  const empty = harness([]); await empty.settle(); assert.ok(empty.find(node => node.props?.children === 'Chưa có video MP4 thuyết minh được công khai.')); empty.blur();
  const failed = harness([], true); await failed.settle(); assert.ok(failed.find(node => node.props?.accessibilityRole === 'alert')); failed.blur();
});
test('native controls provide seek; catalog and audio controls stay independent', () => {
  const component = read('../src/features/museum/PublicVideoSection.tsx'), screens = read('../src/features/museum/MuseumScreens.tsx');
  assert.match(component, /nativeControls/); assert.doesNotMatch(component, /\.play\(|autoPlay|resultService/);
  assert.match(screens, /<PublicAudioSection \/>/); assert.match(screens, /<PublicVideoSection \/>/); assert.match(screens, /publicMuseum\.videos\.map/);
});
test('actual native component initializes null source, exposes controls and aborts on blur/close', async () => {
  const player = nativePlayer(), effects = [], blur = [], cleanups = []; let closed = 0;
  const { PublicVideoPlayer } = compile(read('../src/features/museum/PublicVideoSection.tsx'), {
    react: { useState: value => [value, () => {}], useCallback: fn => fn, useRef: value => ({ current: value }), useEffect: fn => effects.push(fn) },
    'react-native': { View: 'div', Text: 'span', Pressable: 'button', StyleSheet: { create: v => v } },
    'expo-router': { useFocusEffect: fn => blur.push(fn()) },
    'expo-video': { VideoView: 'video', useVideoPlayer: (source, setup) => { assert.equal(source, null); setup(player); return player; } },
    '../../config/env': { env: { apiBaseUrl: base } }, './theme': { ms: {}, museum: {} },
    './publicVideo.mjs': { ...contract, loadPublicVideo: (...args) => contract.loadPublicVideo(...args, allowed) },
  });
  const tree = PublicVideoPlayer({ video, onClose: () => { closed++; }, onRetry: () => {} });
  effects.forEach(fn => cleanups.push(fn())); await settle();
  assert.equal(find(tree, node => node.type === 'video').props.nativeControls, true);
  assert.equal(player.staysActiveInBackground, false); assert.equal(player.plays, 0);
  blur.forEach(fn => fn()); assert.equal(player.sources.at(-1), null);
  find(tree, node => node.type === 'button').props.onPress(); assert.equal(closed, 1);
  cleanups.forEach(fn => fn());
});

test('Admin-published Results appear, then revoked Result and active player disappear on refresh', async () => {
  const second = { ...video, id: 'c'.repeat(24), languageCode: 'vi', fileUrl: video.fileUrl.replace(id, 'c'.repeat(24)) };
  const h = harness([video, second]); await h.settle();
  assert.ok(h.find(node => node.props?.accessibilityLabel === 'Xem video Dự án demo — Tiếng Anh'));
  assert.ok(h.find(node => node.props?.accessibilityLabel === 'Xem video Dự án demo — Tiếng Việt'));
  h.find(node => node.props?.accessibilityLabel === 'Xem video Dự án demo — Tiếng Anh').props.onPress(); h.render();
  assert.equal(h.find(node => node.props?.video).props.video.id, id);
  h.setResponse([second]); h.refresh()(); h.render();
  assert.equal(h.find(node => node.props?.video), undefined, 'refresh must unmount the old native player before waiting for network');
  await h.settle();
  assert.equal(h.find(node => node.props?.accessibilityLabel === 'Xem video Dự án demo — Tiếng Anh'), undefined);
  assert.ok(h.find(node => node.props?.accessibilityLabel === 'Xem video Dự án demo — Tiếng Việt'));
  h.setResponse([]); h.refresh()(); await h.settle();
  assert.ok(h.find(node => node.props?.children === 'Chưa có video MP4 thuyết minh được công khai.')); h.blur();
});
test('failed or superseded refresh cannot retain or restore a revoked Result', async () => {
  const h = harness(); await h.settle();
  let finish;
  const refresh = h.refresh();
  h.setResponse(() => new Promise(resolve => { finish = resolve; })); refresh();
  h.setResponse([]); refresh(); await h.settle();
  finish([video]); await h.settle();
  assert.equal(h.find(node => node.props?.accessibilityLabel?.startsWith('Xem video')), undefined);
  assert.ok(h.find(node => node.props?.children === 'Chưa có video MP4 thuyết minh được công khai.')); h.blur();
  const failed = harness(); await failed.settle();
  failed.setResponse([], true); failed.refresh()(); await failed.settle();
  assert.ok(failed.find(node => node.props?.accessibilityRole === 'alert'));
  assert.equal(failed.find(node => node.props?.accessibilityLabel?.startsWith('Xem video')), undefined); failed.blur();
});
test('Mobile rejects ADMIN authentication and exposes no publication management route or action', async () => {
  let role = 'ADMIN', saved = 0, cleared = 0;
  const { authService } = compile(read('../src/features/auth/authService.ts'), {
    '../../lib/api': { api: async () => ({ user: { id: 'fixture', role } }), session: { set: async () => { saved++; } } },
    '../projects/projectRepository': { projectRepository: { clearSessionCache: () => { cleared++; } } },
  });
  await assert.rejects(authService.login({ email: 'fixture@example.test', password: 'mock-only' }), /CUSTOMER_REQUIRED/);
  assert.equal(saved, 0); assert.equal(cleared, 0);
  role = 'CUSTOMER'; await authService.login({ email: 'fixture@example.test', password: 'mock-only' });
  assert.equal(saved, 1); assert.equal(cleared, 1);
  const routes = readdirSync(new URL('../src/app/', import.meta.url), { recursive: true }).filter(path => /\.(tsx?|jsx?)$/.test(path));
  assert.ok(!routes.some(path => /(^|[\\/])(admin|\(admin\))([\\/]|\.)/i.test(path)));
  assert.match(read('../src/features/auth/useCurrentUser.ts'), /user\.role !== 'CUSTOMER'/);
  const publicSource = read('../src/features/museum/PublicVideoSection.tsx') + read('../src/features/museum/publicVideo.mjs');
  assert.doesNotMatch(publicSource, /Duyệt video|VideoPublication|\/admin\/|method:\s*['"]PATCH|isApproved|resultService|accessToken/);
});
