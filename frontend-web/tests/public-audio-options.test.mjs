import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { publicAudioOptionKey, publicAudioOptionLabel } from '../src/features/results/publicAudioOptions.mjs'
const require = createRequire(import.meta.url)
const options = [
  { code: 'vi', name: 'Tiếng Việt', projectId: 'p1', type: 'ORIGINAL_AUDIO', optionId: 'original:1', audioUrl: '/api/published-original-audio/1/audio' },
  { code: 'vi', name: 'Tiếng Việt', projectId: 'p1', type: 'AI_NARRATION', optionId: 'narration:1', audioUrl: '/api/projects/public-audio/p1/1' },
  { code: 'en', name: 'Tiếng Anh', projectId: 'p2', type: 'AI_NARRATION', optionId: 'narration:2', audioUrl: '/api/projects/public-audio/p2/2' },
]
test('original and AI options in the same language have distinct identities and honest labels', () => {
  assert.equal(new Set(options.map(publicAudioOptionKey)).size, 3)
  assert.equal(publicAudioOptionLabel(options[0]), 'Âm thanh gốc — Tiếng Việt')
  assert.equal(publicAudioOptionLabel(options[2]), 'Thuyết minh AI — Tiếng Anh')
  assert.equal(publicAudioOptionLabel({ code: 'en', name: 'Tiếng Anh', projectId: 'legacy' }), 'Thuyết minh AI — Tiếng Anh')
})

test('audio cards label VIDEO-source guides as audio for new and legacy public responses', () => {
  for (const metadata of [{ mediaType: 'VIDEO', sourceMediaType: 'VIDEO', artifactType: 'AUDIO' }, { mediaType: 'VIDEO' }]) {
    let cursor = 0
    const guide = { key: 'fixture', title: 'Fixture audio guide', description: '', languages: options, ...metadata }
    const values = [[guide], false, {}, null]
    const exports = {}
    const code = ts.transpileModule(readFileSync(new URL('../src/components/museum/MuseumCustomerAudioSection.tsx', import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
    runInNewContext(code, { exports, require: key => key === 'react' ? { ...require('react'), useState: () => [values[cursor++], () => {}], useEffect: () => {} }
      : key === '../../config/env' ? { env: { apiBaseUrl: 'http://fixture.test/api' } }
        : key === '../../features/results/AudioGuideModal' ? { AudioGuideModal: () => null }
          : key === '../../features/results/publicAudioOptions.mjs' ? { publicAudioOptionKey, publicAudioOptionLabel } : require(key) })
    const html = require('react-dom/server').renderToStaticMarkup(require('react').createElement(exports.MuseumCustomerAudioSection))
    assert.match(html, /<span>Âm thanh<\/span>/)
    assert.doesNotMatch(html, /<span>Video<\/span>/)
    for (const option of options) assert.ok(html.includes(publicAudioOptionKey(option)))
  }
})
test('actual modal selects each supplied option, starts paused and stops the preceding audio', async () => {
  let cursor = 0, tree, playCalls = 0, pauses = 0, closed = 0
  const slots = [], refs = [], effects = []
  const React = { ...require('react'), useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = value }] },
    useMemo(fn) { return fn() }, useCallback(fn) { return fn }, useEffect(fn) { effects.push(fn) },
    useRef(value) { const i = cursor++; if (!(i in slots)) { slots[i] = { current: value }; refs.push(slots[i]) } return slots[i] },
  }
  const exports = {}
  const code = ts.transpileModule(readFileSync(new URL('../src/features/results/AudioGuideModal.tsx', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  runInNewContext(code, { exports, require: key => key === 'react' ? React : key === '../../config/env' ? { env: { apiBaseUrl: 'http://fixture.test/api' } }
    : key === '../analytics/analyticsService' ? { trackListen: async () => {} }
      : key === './publicAudioOptions.mjs' ? { publicAudioOptionKey, publicAudioOptionLabel } : require(key) })
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return null
    if (predicate(node)) return node
    for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found }
    return null
  }
  const audio = { pause() { pauses++ }, play() { playCalls++; return Promise.resolve() }, currentTime: 0, removeAttribute() {}, load() {} }
  const render = () => { cursor = 0; tree = exports.AudioGuideModal({ projectId: 'p1', projectName: 'Fixture', initialLanguage: 'original:1', availableLanguages: options, onClose: () => { closed++ } });
    find(tree, node => node.type === 'audio').props.ref.current = audio; return tree }
  render(); assert.equal(playCalls, 0)
  assert.equal(find(tree, node => node.type === 'audio').props.src, 'http://fixture.test/api/published-original-audio/1/audio')
  assert.equal(find(tree, node => node.type === 'audio').props.autoPlay, undefined)
  const chip = key => find(tree, node => node.key === key)
  chip('narration:1').props.onClick(); render()
  assert.equal(pauses, 1); assert.equal(playCalls, 0)
  assert.equal(find(tree, node => node.type === 'audio').props.src, 'http://fixture.test/api/projects/public-audio/p1/1')
  chip('narration:2').props.onClick(); render(); assert.equal(pauses, 2)
  find(tree, node => node.props?.['aria-label'] === 'Đóng cửa sổ nghe').props.onClick()
  assert.equal(closed, 1); assert.equal(pauses, 3)
  assert.equal(effects.length > 0, true) // effects are intentionally not executed as browser/media runtime
})
