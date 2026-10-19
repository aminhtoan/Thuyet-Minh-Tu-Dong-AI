import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const assets = new Set(['/museum-media/test-vi.mp4', '/museum-media/test-en.webm', '/museum-media/test-en.vtt', '/museum-media/test-poster.webp'])
function compile(source, dependencies, globals = {}) {
  const exports = {}
  runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), ...globals,
  })
  return exports
}
const contract = compile(read('features/museum/publicVideos.ts'), { './publicMediaAssets': { publicMuseumAssetPaths: assets } })
// All content and paths below are test fixtures; no files or application data are created.
const video = {
  slug: 'test-only-video', title: 'Video kiểm thử', description: 'Fixture chỉ dùng trong test.',
  visibility: 'PUBLIC', publishedStatus: 'PUBLISHED', sourceLanguage: 'vi',
  sourceAttribution: { label: 'Nguồn test', reference: 'Fixture nội bộ' },
  rights: { confirmed: true, license: 'Test license', credit: 'Test credit', verificationReference: 'Test review' },
  posterUrl: '/museum-media/test-poster.webp',
  languageVariants: [
    { language: 'vi', state: 'AVAILABLE', videoUrl: '/museum-media/test-vi.mp4', transcript: { language: 'vi', text: 'Nội dung vi chỉ dùng trong test.' } },
    { language: 'en', state: 'AVAILABLE', videoUrl: '/museum-media/test-en.webm', captionUrl: '/museum-media/test-en.vtt', captionLanguage: 'en', transcript: { language: 'en', text: 'English test content only.' } },
    { language: 'th', state: 'PROCESSING' }, { language: 'ko', state: 'UNAVAILABLE' },
    { language: 'zh-CN', state: 'AVAILABLE', videoUrl: '/museum-media/missing.mp4' },
  ],
}

function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map((node) => find(node, predicate)).find(Boolean)
  if (!tree || typeof tree !== 'object') return undefined
  return predicate(tree) ? tree : find(tree.props?.children, predicate)
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ')
  return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : tree?.props ? text(tree.props.children) : ''
}

// Exercise real component event handlers/effects with controlled hooks and timers.
function harness(file, exportName, extraExport = '') {
  const slots = [], timers = new Map()
  let cursor = 0, pending = [], sequence = 0, pauses = 0
  const react = {
    useState(initial) {
      const index = cursor++
      if (!Object.hasOwn(slots, index)) slots[index] = typeof initial === 'function' ? initial() : initial
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial } },
    useId() { return 'test-language-group' },
    useEffect(effect, deps) {
      const index = cursor++, previous = slots[index]
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        pending.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() } })
      }
    },
  }
  const modules = compile(read(file) + extraExport, {
    react,
    './MuseumButton': { MuseumButton: 'button' },
    '../components/museum': {},
    '../components/museum/MuseumVideoPlayer': { MuseumVideoPlayer: 'test-player' },
    '../components/museum/MuseumVideoLanguages': { MuseumVideoLanguages: 'test-languages' },
    '../../features/museum/publicVideos': contract,
    '../features/museum/publicVideos': contract,
    '../styles/museum-video.css': {},
  }, { window: { setTimeout: (callback) => { const id = ++sequence; timers.set(id, callback); return id }, clearTimeout: (id) => timers.delete(id) } })
  return {
    render(props) {
      cursor = 0; pending = []
      const tree = modules[exportName](props)
      const element = find(tree, (node) => node.type === 'video')
      if (element?.props.ref) element.props.ref.current = { pause: () => pauses++ }
      pending.forEach((effect) => effect())
      return tree
    },
    expire() { for (const [id, callback] of timers) { timers.delete(id); callback() } },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()) },
    get timerCount() { return timers.size }, get pauses() { return pauses },
  }
}

test('public video publication requires public status, rights, source and a real inventoried Vietnamese asset', () => {
  assert.equal(contract.getPublishedPublicVideos([], assets).length, 0)
  assert.equal(contract.getPublishedPublicVideos([video], assets).length, 1)
  for (const invalid of [
    { ...video, visibility: 'PRIVATE' }, { ...video, publishedStatus: 'DRAFT' }, { ...video, sourceLanguage: 'en' },
    { ...video, rights: { ...video.rights, confirmed: false } }, { ...video, rights: { ...video.rights, license: '' } },
    { ...video, sourceAttribution: { label: '', reference: '' } },
  ]) assert.equal(contract.getPublishedPublicVideos([invalid], assets).length, 0)
  assert.equal(contract.getPublishedPublicVideos([video], new Set()).length, 0)
  assert.equal(contract.getPublishedPublicVideos([video, video], assets).length, 0)
})

test('authorized YouTube-sourced video publishes only when its Vietnamese asset exists', () => {
  assert.equal(contract.museumPublicVideos.length, 1)
  const draft = contract.museumPublicVideos[0]
  assert.equal(draft.slug, 'bao-tang-chung-tich-chien-tranh')
  assert.equal(draft.publishedStatus, 'PUBLISHED')
  assert.equal(draft.visibility, 'PUBLIC')
  assert.equal(draft.rights.confirmed, true)
  assert.match(draft.rights.verificationReference, /MUSEUM-06\.2/)
  assert.equal(draft.rights.credit, 'Nguồn video: YouTube — xem video gốc')
  assert.match(draft.rights.license, /không phải giấy phép Creative Commons/)
  assert.equal(draft.sourceAttribution.label, 'YouTube')
  assert.equal(draft.sourceAttribution.reference, 'https://youtu.be/_MN6nsn-XDM')
  assert.equal(draft.sourceLanguage, 'vi')
  assert.equal(draft.languageVariants.length, 5)
  for (const variant of draft.languageVariants) {
    assert.equal(variant.state, variant.language === 'vi' ? 'AVAILABLE' : 'UNAVAILABLE')
    assert.equal(variant.transcript, undefined)
    assert.equal(variant.captionUrl, undefined)
  }
  assert.equal(draft.languageVariants[0].videoUrl, '/museum/videos/bao-tang-chung-tich-chien-tranh.mp4')
  assert.equal(contract.getPublishedPublicVideos().length, 0)
  assert.equal(contract.getPublishedPublicVideos([draft], new Set([draft.languageVariants[0].videoUrl])).length, 1)
})

test('credit links allow only HTTPS YouTube video references without credentials or injected URLs', () => {
  const entry = contract.museumPublicVideos[0]
  assert.equal(contract.getPublicVideoSourceUrl(entry), 'https://youtu.be/_MN6nsn-XDM')
  for (const reference of ['javascript:alert(1)', 'https://youtu.be.evil.test/_MN6nsn-XDM', 'https://user:secret@youtu.be/_MN6nsn-XDM', '/api/projects/private', 'https://youtu.be/_MN6nsn-XDM?token=secret']) {
    assert.equal(contract.getPublicVideoSourceUrl({ ...entry, sourceAttribution: { ...entry.sourceAttribution, reference } }), undefined)
  }
})

test('new museum media directories enforce the correct asset kind and preserve legacy paths', () => {
  const paths = {
    video: '/museum/videos/bao-tang-chung-tich-chien-tranh.mp4',
    poster: '/museum/posters/bao-tang.webp',
    caption: '/museum/captions/bao-tang-vi.vtt',
  }
  const inventory = new Set(Object.values(paths))
  for (const [kind, path] of Object.entries(paths)) {
    assert.equal(contract.isPublicVideoAsset(path, kind, inventory), true)
    assert.equal(contract.isPublicVideoAsset(path, kind, new Set()), false)
  }
  for (const [path, kind] of [['/museum/posters/wrong.mp4', 'video'], ['/museum/videos/wrong.vtt', 'caption'], ['/museum/captions/wrong.webp', 'poster'], ['/museum/videos/../private.mp4', 'video'], ['/museum/videos/file.mp4?token=test', 'video']]) {
    assert.equal(contract.isPublicVideoAsset(path, kind, new Set([path])), false)
  }
  assert.equal(contract.isPublicVideoAsset('/museum-media/test-vi.mp4', 'video', assets), true)
})

test('public media guard rejects protected paths, external URLs, tokens, traversal and missing assets', () => {
  for (const url of ['/api/projects/private/result', '/uploads/private.mp4', 'https://example.test/a.mp4', '//example.test/a.mp4', 'blob:secret', '/museum-media/../test-vi.mp4', '/museum-media/test-vi.mp4?token=secret']) {
    assert.equal(contract.isPublicVideoAsset(url, 'video', new Set([...assets, url])), false)
  }
  assert.equal(contract.isPublicVideoAsset('/museum-media/missing.mp4', 'video', assets), false)
  assert.equal(contract.isPublicVideoAsset('/museum-media/test-en.vtt', 'video', assets), false)
})

test('variants require AVAILABLE media and matching transcript/caption language, without duplicate IDs', () => {
  assert.ok(contract.getPublicVideoVariant(video, 'en', assets))
  for (const code of ['th', 'ko', 'zh-CN']) assert.equal(contract.getPublicVideoVariant(video, code, assets), undefined)
  const en = video.languageVariants[1]
  for (const changed of [{ ...en, captionLanguage: 'vi' }, { ...en, transcript: { language: 'vi', text: 'Wrong' } }, { ...en, transcript: { language: 'en', text: ' ' } }, { ...en, chapters: [{ startTime: -1, title: 'Invalid' }] }]) {
    assert.equal(contract.getPublicVideoVariant({ ...video, languageVariants: [video.languageVariants[0], changed] }, 'en', assets), undefined)
  }
  assert.equal(contract.getPublicVideoVariant({ ...video, languageVariants: [en, en] }, 'en', assets), undefined)
})

test('language controls expose statuses and disabled choices cannot change selection', () => {
  const h = harness('components/museum/MuseumVideoLanguages.tsx', 'MuseumVideoLanguages')
  const selected = []
  const tree = h.render({ video, selected: 'vi', onChange: (code) => selected.push(code) })
  const input = (code) => find(tree, (node) => node.type === 'input' && node.props.value === code)
  assert.equal(input('en').props.disabled, false)
  input('en').props.onChange()
  for (const code of ['th', 'ko', 'zh-CN']) { assert.equal(input(code).props.disabled, true); input(code).props.onChange() }
  assert.deepEqual(selected, ['en'])
  for (const label of ['Sẵn sàng', 'Đang xử lý', 'Đang chuẩn bị']) assert.ok(text(tree).includes(label))
})

test('player provides native controls, metadata preload, matching caption and no autoplay', () => {
  const h = harness('components/museum/MuseumVideoPlayer.tsx', 'LoadedMuseumVideo', '\nexport { LoadedMuseumVideo }')
  const props = { variant: video.languageVariants[1], title: video.title, onRetry() {} }
  let tree = h.render(props)
  const media = find(tree, (node) => node.type === 'video')
  assert.equal(media.props.controls, true)
  assert.equal(media.props.preload, 'metadata')
  assert.equal(media.props.autoPlay, undefined)
  const track = find(tree, (node) => node.type === 'track')
  assert.equal(track.props.srcLang, 'en')
  assert.equal(track.props.src, '/museum-media/test-en.vtt')
  assert.ok(text(tree).includes('Đang tải video'))
  media.props.onLoadedMetadata(); tree = h.render(props)
  assert.ok(!text(tree).includes('Đang tải video'))
  assert.equal(h.timerCount, 0)
  track.props.onError(); tree = h.render(props)
  assert.ok(text(tree).includes('Không thể tải phụ đề'))
  h.unmount(); assert.equal(h.pauses, 1)
})

test('player error and metadata timeout end loading, expose retry, and reject late READY events', () => {
  for (const failure of ['error', 'timeout']) {
    let retries = 0
    const h = harness('components/museum/MuseumVideoPlayer.tsx', 'LoadedMuseumVideo', '\nexport { LoadedMuseumVideo }')
    const props = { variant: video.languageVariants[0], title: video.title, onRetry: () => retries++ }
    let tree = h.render(props)
    const media = find(tree, (node) => node.type === 'video')
    if (failure === 'error') media.props.onError(); else h.expire()
    tree = h.render(props)
    assert.ok(text(tree).includes('Không thể tải video'))
    assert.equal(find(tree, (node) => node.type === 'video'), undefined)
    media.props.onCanPlay(); tree = h.render(props)
    assert.ok(text(tree).includes('Không thể tải video'))
    find(tree, (node) => node.type === 'button').props.onClick(); assert.equal(retries, 1)
    h.unmount(); assert.equal(h.timerCount, 0)
  }
})

test('player fails closed without valid publication and changes its instance on source/language/retry', () => {
  const h = harness('components/museum/MuseumVideoPlayer.tsx', 'MuseumVideoPlayer')
  assert.ok(text(h.render({ video: { ...video, visibility: 'PRIVATE' }, language: 'vi' })).includes('Video đang được chuẩn bị'))
  const vi = h.render({ video, language: 'vi' }), en = h.render({ video, language: 'en' })
  assert.notEqual(vi.key, en.key)
  en.props.onRetry()
  assert.notEqual(en.key, h.render({ video, language: 'en' }).key)
  assert.ok(text(h.render({ video, language: 'zh-CN' })).includes('Video đang được chuẩn bị'))
})

test('switching the selected language updates player and transcript together without retaining previous text', () => {
  const h = harness('pages/MuseumVideoDetailPage.tsx', 'VideoExperience', '\nexport { VideoExperience }')
  let tree = h.render({ video })
  assert.ok(text(tree).includes('Nội dung vi'))
  find(tree, (node) => node.type === 'test-languages').props.onChange('en')
  tree = h.render({ video })
  assert.equal(find(tree, (node) => node.type === 'test-player').props.language, 'en')
  assert.ok(text(tree).includes('English test content'))
  assert.ok(!text(tree).includes('Nội dung vi'))
})
