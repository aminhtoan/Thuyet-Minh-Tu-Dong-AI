import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const read = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
function compile(source, overrides = {}, globals = {}) {
  const exports = {}
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, require: key => overrides[key] ?? require(key), AbortController, URL, ...globals })
  return exports
}
const projectId = 'a'.repeat(24), id = 'b'.repeat(24)
const video = { id, projectId, title: 'Dự án demo', languageCode: 'en', duration: 28, artifactType: 'VIDEO', sourceMediaType: 'VIDEO', mimeType: 'video/mp4',
  fileUrl: `/api/published-video-narrations/public/projects/${projectId}/results/${id}/file` }
const browser = { location: { origin: 'http://localhost:5173' } }
function contract(fetch = () => { throw Error('No live network allowed') }) {
  return compile(read('features/museum/publishedVideos.ts'), { '../../config/env': { env: { apiBaseUrl: 'http://localhost:8080/api' } } }, { window: browser, fetch })
}
const envelope = videos => ({ success: true, data: { videos } })
test('listing uses only the public API, no credentials or cache, and accepts valid generated MP4', async () => {
  const calls = []
  const service = contract(async (...args) => { calls.push(args); return { ok: true, json: async () => envelope([video]) } })
  const result = await service.listPublishedVideos()
  assert.equal(result.length, 1); assert.equal(result[0].id, id)
  assert.equal(calls[0][0], 'http://localhost:8080/api/published-video-narrations/public')
  assert.equal(calls[0][1].cache, 'no-store'); assert.equal(calls[0][1].credentials, 'omit')
})
test('empty listing is valid; errors and non-public response schemas are not empty success', async () => {
  assert.equal(contract().parsePublishedVideos(envelope([])).length, 0)
  assert.throws(() => contract().parsePublishedVideos({ success: true, data: { results: [video] } }))
  await assert.rejects(contract(async () => ({ ok: false, status: 403 })).listPublishedVideos())
})
test('multiple MP4s and languages in one project keep Result identity; duplicates fail closed', () => {
  const second = { ...video, id: 'c'.repeat(24), languageCode: 'vi', fileUrl: video.fileUrl.replace(id, 'c'.repeat(24)) }
  const third = { ...video, id: 'd'.repeat(24), fileUrl: video.fileUrl.replace(id, 'd'.repeat(24)) }
  assert.equal(contract().parsePublishedVideos(envelope([video, second, third])).length, 3)
  assert.equal(contract().parsePublishedVideos(envelope([video, video])).length, 0)
})
test('protected/source/external paths, cross-project URLs and non-video artifacts cannot become public video', () => {
  for (const candidate of [
    { ...video, fileUrl: `/api/projects/${projectId}/results/${id}/file` },
    { ...video, fileUrl: `/api/projects/${projectId}/source` },
    { ...video, fileUrl: `https://untrusted.example${video.fileUrl}` },
    { ...video, fileUrl: `${video.fileUrl}?token=secret` },
    { ...video, projectId: 'e'.repeat(24) }, { ...video, artifactType: 'AUDIO' }, { ...video, duration: NaN },
  ]) assert.equal(contract().parsePublishedVideos(envelope([candidate])).length, 0)
})
test('fresh HEAD checks revocation and MIME without authenticated or protected fallback', async () => {
  const calls = [], signal = new AbortController().signal
  const allowed = contract(async (...args) => { calls.push(args); return { ok: true, headers: new Headers({ 'content-type': 'video/mp4' }) } })
  assert.equal(await allowed.checkPublishedVideo(video, signal), `http://localhost:8080${video.fileUrl}`)
  assert.equal(calls[0][1].method, 'HEAD'); assert.equal(calls[0][1].redirect, 'error'); assert.equal(calls[0][1].cache, 'no-store')
  for (const status of [403, 404]) {
    let attempts = 0
    await assert.rejects(contract(async () => { attempts++; return { ok: false, status, headers: new Headers() } }).checkPublishedVideo(video, signal))
    assert.equal(attempts, 1)
  }
  await assert.rejects(contract(async () => ({ ok: true, headers: new Headers({ 'content-type': 'text/html' }) })).checkPublishedVideo(video, signal))
})
function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map(node => find(node, predicate)).find(Boolean)
  if (!tree || typeof tree !== 'object') return undefined
  return predicate(tree) ? tree : find(tree.props?.children, predicate)
}
function harness(parent = false, service = {}) {
  let cursor = 0, tree, closes = 0, retries = 0, sequence = 0
  const slots = [], effects = [], cleanups = [], timers = new Map()
  const react = { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, n) => d !== slots[i].deps[n])) slots[i] = { fn, deps }; return slots[i].fn },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, n) => d !== slots[i][n])) { slots[i] = deps; effects.push(fn) } } }
  const components = compile(read('components/museum/MuseumPublishedVideos.tsx'), { react, './MuseumButton': { MuseumButton: 'button' }, './MuseumCard': { MuseumCard: 'article' },
    '../../features/museum/publishedVideos': { publishedVideoLanguage: code => code, checkPublishedVideo: async () => `http://localhost:8080${video.fileUrl}`, listPublishedVideos: async () => [video], ...service },
  }, { window: { ...browser, setTimeout: fn => { timers.set(++sequence, fn); return sequence }, clearTimeout: key => timers.delete(key) } })
  const render = () => { cursor = 0; tree = parent ? components.MuseumPublishedVideos() : components.PublishedVideoPlayer({ video, onClose: () => { closes++ }, onRetry: () => { retries++ } }); return tree }
  const settle = async () => { render(); effects.splice(0).forEach(fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup) }); await new Promise(resolve => setImmediate(resolve)); return render() }
  return { render, settle, find: predicate => find(tree, predicate), cleanup: () => cleanups.forEach(fn => fn()),
    expire: () => [...timers.values()].forEach(fn => fn()), get closes() { return closes }, get retries() { return retries } }
}
test('player starts paused, offers native play/pause/seek, and releases media on close/unmount', async () => {
  const h = harness(); await h.settle()
  const media = h.find(node => node.type === 'video'); assert.ok(media)
  assert.equal(media.props.controls, true); assert.equal(media.props.autoPlay, undefined); assert.equal(media.props.preload, 'metadata')
  let paused = 0, unloaded = 0
  media.props.ref.current = { pause: () => { paused++ }, removeAttribute: value => assert.equal(value, 'src'), load: () => { unloaded++ } }
  media.props.onLoadedMetadata(); h.render(); assert.equal(h.find(node => node.props?.role === 'status'), undefined)
  h.find(node => node.props?.children === 'Đóng video').props.onClick(); assert.equal(h.closes, 1)
  h.cleanup(); assert.equal(paused, 2); assert.equal(unloaded, 2)
})
test('revoked HEAD does not attach a player URL; playback errors remove media and require listing reload', async () => {
  const denied = harness(false, { checkPublishedVideo: async () => { throw Error('404') } }); await denied.settle()
  assert.equal(denied.find(node => node.type === 'video'), undefined); assert.ok(denied.find(node => node.props?.role === 'alert')); denied.cleanup()
  const h = harness(); await h.settle(); const media = h.find(node => node.type === 'video')
  let paused = 0
  media.props.ref.current = { pause: () => { paused++ }, removeAttribute() {}, load() {} }
  media.props.onError(); h.render(); assert.equal(paused, 1); assert.equal(h.find(node => node.type === 'video'), undefined)
  h.find(node => node.props?.children === 'Tải lại danh sách').props.onClick(); assert.equal(h.retries, 1); h.cleanup()
})
test('loading has a finite timeout and stale checks after unmount cannot attach media', async () => {
  let complete
  const h = harness(false, { checkPublishedVideo: () => new Promise(resolve => { complete = resolve }) }); await h.settle()
  assert.ok(h.find(node => node.props?.role === 'status')); h.cleanup(); complete(video.fileUrl); await h.settle()
  assert.equal(h.find(node => node.type === 'video'), undefined)
  const stalled = harness(); await stalled.settle(); stalled.expire(); stalled.render()
  assert.ok(stalled.find(node => node.props?.role === 'alert')); stalled.cleanup()
})
test('public section has distinct loading, empty and failure states and never opens a video automatically', async () => {
  const h = harness(true); await h.settle(); assert.equal(h.find(node => typeof node.type === 'function' && node.props?.video), undefined)
  assert.ok(h.find(node => node.props?.children === 'Xem video')); h.cleanup()
  const empty = harness(true, { listPublishedVideos: async () => [] }); await empty.settle()
  assert.match(empty.find(node => node.props?.role === 'status').props.children, /Chưa có video MP4/); empty.cleanup()
  const error = harness(true, { listPublishedVideos: async () => { throw Error('offline') } }); await error.settle()
  assert.ok(error.find(node => node.props?.role === 'alert')); error.cleanup()
})
test('editorial catalog and audio remain separate and no protected fallback is introduced', () => {
  const page = read('pages/MuseumVideosPage.tsx'), source = read('components/museum/MuseumPublishedVideos.tsx') + read('features/museum/publishedVideos.ts')
  assert.match(page, /<MuseumCustomerAudioSection \/>/); assert.match(page, /<MuseumPublishedVideos \/>/); assert.match(page, /getPublishedPublicVideos\(\)/)
  assert.doesNotMatch(source, /adminApi|resultService|accessToken|createObjectURL|localStorage|sessionStorage|\.play\(/)
  assert.match(read('features/museum/publicVideos.ts'), /museumPublicVideos/)
})
