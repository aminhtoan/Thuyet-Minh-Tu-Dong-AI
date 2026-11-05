import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const realRequire = createRequire(import.meta.url)
class ApiError extends Error { constructor(code, message, status = 409) { super(message); this.code = code; this.status = status } }
function loader(overrides = {}, globals = {}) {
  const cache = new Map()
  function load(path) {
    const full = resolve(root, path)
    if (cache.has(full)) return cache.get(full)
    const exports = {}; cache.set(full, exports)
    const source = readFileSync(full, 'utf8').replaceAll('import.meta.env', '({})')
    runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, AbortController, FormData, Blob, URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} },
      window: { addEventListener() {}, removeEventListener() {}, confirm() { throw Error('No paid actions in fixtures') } },
      require: name => {
        if (name.endsWith('.css')) return {}
        const base = name.split('/').at(-1)
        if (Object.hasOwn(overrides, name)) return overrides[name]
        if (Object.hasOwn(overrides, base)) return overrides[base]
        if (!name.startsWith('.')) return realRequire(name)
        const next = resolve(dirname(full), name)
        if (name.endsWith('.mjs')) return realRequire(next)
        const found = [next, next + '.ts', next + '.tsx'].find(existsSync)
        if (!found) throw Error('Missing fixture dependency: ' + name)
        return load(found)
      }, ...globals,
    })
    return exports
  }
  return load
}
function hooks() {
  const slots = []; let cursor = 0; let effects = []
  return {
    react: { ...React,
      useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next }] },
      useRef(initial) { return slots[cursor++] ??= { current: initial } },
      useEffect(effect, deps = []) { const index = cursor++; const old = slots[index]; if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) effects.push(() => { old?.cleanup?.(); slots[index] = { deps, cleanup: effect() } }) },
      useCallback(fn) { cursor++; return fn },
    },
    render(fn) { cursor = 0; effects = []; const tree = fn(); effects.forEach(effect => effect()); return tree },
  }
}
function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map(child => find(child, predicate)).find(Boolean)
  if (!tree || typeof tree !== 'object') return undefined
  return predicate(tree) ? tree : find(tree.props?.children, predicate)
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ')
  return typeof tree === 'string' ? tree : tree?.props ? text(tree.props.children) : ''
}
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(done => setImmediate(done)) }
const common = Object.fromEntries(['Button', 'Card', 'Input', 'Icon', 'Spinner', 'Badge', 'PageHeader', 'WorkflowSteps', 'ProjectStatusBadge', 'ErrorState'].map(name => [name, { [name]: name }]))
const source = loader()('features/projects/sourceLanguage.ts')
const project = { id: 'fixture-project', name: 'Fixture', sourceLanguage: null, sourceLanguageMode: 'AUTO', sourceLanguageStatus: 'NEEDS_CONFIRMATION', status: 'TRANSCRIBED', workflow: { step: 'TRANSLATION', state: 'BLOCKED', canResume: false } }
const transcript = { id: 'fixture-transcript', projectId: project.id, revision: 7, languageCode: null, sourceLanguageStatus: 'NEEDS_CONFIRMATION', fullText: 'Xin chào. Hello.', segments: [{ id: 's1', text: 'Xin chào.' }], status: 'SAVED' }

test('source contract: five manual choices; AUTO payload has no fabricated source; legacy source stays confirmed', () => {
  assert.deepEqual(Array.from(source.manualSourceOptions, option => option.value), ['vi', 'en', 'ja', 'ko', 'zh'])
  assert.deepEqual(JSON.parse(JSON.stringify(source.createSourcePayload('AUTO', 'vi'))), { sourceLanguageMode: 'AUTO' })
  for (const code of ['vi', 'en', 'ja', 'ko', 'zh']) assert.equal(source.createSourcePayload('MANUAL', code).sourceLanguage, code)
  for (const code of ['fr', '', 'auto', 'unknown']) assert.throws(() => source.createSourcePayload('MANUAL', code))
  assert.equal(source.sourceState({ sourceLanguage: 'en' }).mode, 'MANUAL')
  assert.equal(source.sourceState({ sourceLanguage: 'en' }).confirmed, true)
  assert.equal(source.sourceState({ sourceLanguage: null }).confirmed, false)
  assert.equal(source.sourceState({ ...project, sourceLanguage: 'vi' }).language, null)
  assert.equal(source.canReviewUnconfirmedSource(project), true)
  assert.equal(source.canReviewUnconfirmedSource({ ...project, sourceLanguageMode: 'MANUAL' }), false)
  assert.equal(source.canReviewUnconfirmedSource({ ...project, workflow: { ...project.workflow, step: 'GENERATE' } }), false)
})

test('summary exposes three source statuses, never fabricates detected language; valid legacy projects need no confirmation', () => {
  const Component = loader()('features/projects/SourceLanguageSummary.tsx').SourceLanguageSummary
  for (const status of ['PENDING_DETECTION', 'NEEDS_CONFIRMATION', 'CONFIRMED']) {
    const html = renderToStaticMarkup(React.createElement(Component, { project: { ...project, sourceLanguageStatus: status, sourceLanguage: status === 'CONFIRMED' ? 'ja' : null } }))
    assert.ok(html.includes(source.sourceStatusLabels[status]))
    assert.doesNotMatch(html, /Ngôn ngữ được phát hiện/)
    if (status !== 'CONFIRMED') { assert.match(html, /Chưa xác định/); assert.doesNotMatch(html, /Tiếng Việt/) }
  }
  const legacy = renderToStaticMarkup(React.createElement(Component, { project: { sourceLanguage: 'vi' } }))
  assert.match(legacy, /Thủ công \(MANUAL\)/); assert.match(legacy, /Đã xác nhận/); assert.doesNotMatch(legacy, /Hãy đọc bản ghi/)
  const actual = renderToStaticMarkup(React.createElement(Component, { project: { ...project, detectedSourceLanguage: 'ko' } }))
  assert.match(actual, /Ngôn ngữ được phát hiện/); assert.match(actual, /Tiếng Hàn/)
})

function creationFixture() {
  const h = hooks(); const uploads = []
  const Component = loader({ ...common, react: h.react, 'react-router-dom': { Link: 'Link' }, uploadService: { uploadProjectMedia: async input => { uploads.push(input) } } })('pages/NewProjectPlaceholder.tsx').NewProjectPlaceholder
  const render = () => h.render(() => Component())
  function fill() {
    find(render(), node => node.type === 'Input').props.onChange({ target: { value: 'Dự án thử nghiệm' } })
    find(render(), node => node.props?.id === 'media-file').props.onChange({ target: { files: [{ name: 'test.mp4', size: 1024, type: 'video/mp4' }] } })
  }
  return { render, uploads, fill }
}
test('create UI defaults AUTO, omits hint, preserves other fields and does not start STT', async () => {
  const fixture = creationFixture(); let tree = fixture.render()
  assert.equal(find(tree, node => node.props?.id === 'source-language-mode').props.value, 'AUTO')
  assert.equal(find(tree, node => node.props?.id === 'source-language'), undefined)
  fixture.fill(); tree = fixture.render()
  const start = find(tree, node => node.type === 'Button' && text(node).includes('Tạo dự án'))
  assert.equal(start.props.disabled, false); await start.props.onClick()
  assert.equal(fixture.uploads.length, 1); assert.equal(fixture.uploads[0].sourceLanguageMode, 'AUTO')
  assert.equal(Object.hasOwn(fixture.uploads[0], 'sourceLanguage'), false)
  assert.equal(fixture.uploads[0].projectName, 'Dự án thử nghiệm')
})
for (const language of ['vi', 'en', 'ja', 'ko', 'zh']) test(`create MANUAL ${language}, defaults vi on first switch`, async () => {
  const fixture = creationFixture()
  find(fixture.render(), node => node.props?.id === 'source-language-mode').props.onChange({ target: { value: 'MANUAL' } })
  assert.equal(find(fixture.render(), node => node.props?.id === 'source-language').props.value, 'vi')
  find(fixture.render(), node => node.props?.id === 'source-language').props.onChange({ target: { value: language } })
  fixture.fill()
  await find(fixture.render(), node => node.type === 'Button' && text(node).includes('Tạo dự án')).props.onClick()
  assert.equal(fixture.uploads[0].sourceLanguage, language); assert.equal(fixture.uploads[0].sourceLanguageMode, 'MANUAL')
})

test('upload service sends exact create payload then existing media endpoint (mock API only)', async () => {
  const calls = []
  const service = loader({ projectRepository: { projectRepository: { refresh: async () => {} } }, api: { api: async (path, init) => { calls.push({ path, init }); return { project: { id: 'mock' } } } } })('features/projects/uploadService.ts')
  for (const mode of ['AUTO', 'MANUAL']) {
    calls.length = 0
    await service.uploadProjectMedia({ projectName: 'Name', description: 'Desc', sourceLanguageMode: mode, sourceLanguage: 'vi', file: new Blob(['fixture']), signal: new AbortController().signal, onProgress() {} })
    const body = JSON.parse(calls[0].init.body)
    assert.equal(body.name, 'Name'); assert.equal(body.description, 'Desc'); assert.equal(body.sourceLanguageMode, mode)
    assert.equal(Object.hasOwn(body, 'sourceLanguage'), mode === 'MANUAL')
    assert.equal(calls[1].path, '/projects/mock/media'); assert.equal(calls.length, 2)
  }
})

function confirmationFixture({ failure, postGate, refreshFailure, revision = 7 } = {}) {
  const h = hooks(); const calls = []; let reloads = 0; let freshReads = 0; let confirmed = null
  const fresh = { ...project, sourceLanguage: 'en', sourceLanguageStatus: 'CONFIRMED' }
  const load = loader({ ...common, react: h.react,
    api: { ApiError, api: async (path, init) => { calls.push({ path, init }); if (postGate) await postGate; if (failure) throw failure; return { sourceLanguageStatus: 'CONFIRMED' } } },
    projectRepository: { projectRepository: { getProject: async () => { freshReads++; if (refreshFailure) throw Error('GET fixture fail'); return fresh } } },
    transcriptService: { transcriptService: { getTranscript: async () => ({ ...transcript, revision: 8, languageCode: 'en', sourceLanguageStatus: 'CONFIRMED' }) } },
  })
  const Component = load('features/transcript/SourceLanguageConfirmation.tsx').SourceLanguageConfirmation
  const render = () => h.render(() => Component({ project, transcript: { ...transcript, revision }, onConfirmed: value => { confirmed = value }, onProjectReload: async () => { reloads++ } }))
  function select() { find(render(), node => node.props?.id === 'confirmed-source-language').props.onChange({ target: { value: 'en' } }) }
  function submit() { return find(render(), node => node.type === 'Button' && text(node) === 'Xác nhận nguồn') }
  return { render, select, submit, calls, get confirmed() { return confirmed }, get reloads() { return reloads }, get freshReads() { return freshReads } }
}
test('confirmation success sends real revision, refreshes project/transcript, announces success; double submit is fenced', async () => {
  let release; const gate = new Promise(done => { release = done }); const fixture = confirmationFixture({ postGate: gate })
  assert.equal(fixture.submit().props.disabled, true)
  fixture.select(); const button = fixture.submit(); button.props.onClick(); button.props.onClick()
  assert.equal(fixture.calls.length, 1); assert.equal(fixture.submit().props.loading, true)
  assert.equal(fixture.calls[0].path, '/projects/fixture-project/source-language/confirm')
  assert.deepEqual(JSON.parse(fixture.calls[0].init.body), { sourceLanguage: 'en', expectedRevision: 7 })
  release(); await flush()
  assert.equal(fixture.confirmed.revision, 8); assert.equal(fixture.confirmed.languageCode, 'en'); assert.equal(fixture.reloads, 1)
  assert.match(text(fixture.render()), /Đã xác nhận ngôn ngữ nguồn/)
  assert.equal(fixture.submit().props.disabled, true)
})
for (const code of ['SOURCE_LANGUAGE_REVISION_CONFLICT', 'TRANSCRIPT_REVISION_UNAVAILABLE', 'SOURCE_LANGUAGE_HAS_DEPENDENTS', 'SOURCE_LANGUAGE_BUSY', 'SOURCE_LANGUAGE_REVISION_REQUIRED', 'AUTH_REQUIRED']) test(`confirmation ${code}: exposes guard; no automatic retry or revision replacement`, async () => {
  const fixture = confirmationFixture({ failure: new ApiError(code, 'Server fixture reason', code === 'AUTH_REQUIRED' ? 401 : 409) })
  fixture.select(); fixture.submit().props.onClick(); await flush()
  assert.equal(fixture.calls.length, 1); assert.equal(fixture.confirmed, null); assert.equal(fixture.freshReads, 0)
  assert.equal(fixture.submit().props.disabled, true)
  const tree = fixture.render(); assert.ok(find(tree, node => node.props?.role === 'alert'))
  assert.ok(find(tree, node => node.type === 'Button' && text(node) === 'Tải lại dữ liệu'))
  fixture.submit().props.onClick(); await flush(); assert.equal(fixture.calls.length, 1)
})
test('accepted confirmation with failed GET stays blocked; missing revision cannot submit', async () => {
  const fixture = confirmationFixture({ refreshFailure: true }); fixture.select(); fixture.submit().props.onClick(); await flush()
  assert.match(text(fixture.render()), /Máy chủ đã nhận xác nhận nhưng chưa tải lại đủ dữ liệu/)
  assert.equal(fixture.submit().props.disabled, true); assert.equal(fixture.calls.length, 1)
  const missing = confirmationFixture({ revision: null }); missing.select(); assert.equal(missing.submit().props.disabled, true)
  missing.submit().props.onClick(); await flush(); assert.equal(missing.calls.length, 0)
})

test('conflict recovery is an explicit GET-only reload, never another confirmation POST', async () => {
  const fixture = confirmationFixture({ failure: new ApiError('SOURCE_LANGUAGE_REVISION_CONFLICT', 'Conflict') })
  fixture.select(); fixture.submit().props.onClick(); await flush()
  find(fixture.render(), node => node.type === 'Button' && text(node) === 'Tải lại dữ liệu').props.onClick()
  await flush()
  assert.equal(fixture.calls.length, 1); assert.equal(fixture.freshReads, 1); assert.equal(fixture.reloads, 1)
  assert.equal(fixture.confirmed.revision, 8)
})

test('blocked AUTO translation leaves transcript readable and confirmation available; continue requires both confirmed sources', () => {
  for (const confirmed of [false, true]) {
    const h = hooks()
    const current = confirmed ? { ...project, sourceLanguage: 'vi', sourceLanguageMode: undefined, sourceLanguageStatus: undefined,
      workflow: { ...project.workflow, state: 'READY', canResume: true } } : project
    const draft = confirmed ? { ...transcript, languageCode: 'vi', sourceLanguageStatus: undefined } : transcript
    const editor = { draft, status: 'SAVED', hasInvalidSegments: false, segmentErrors: {}, acceptConfirmedTranscript() {}, generate() { throw Error('NO_STT') } }
    const Page = loader({ ...common, react: h.react,
      'react-router-dom': { Link: 'Link', useParams: () => ({ projectId: project.id }), useNavigate: () => () => {} },
      useProjects: { useProject: () => ({ project: current, isLoading: false, reload: async () => {} }) },
      useTranscriptEditor: { useTranscriptEditor: () => editor },
      SourceLanguageConfirmation: { SourceLanguageConfirmation: 'ConfirmSource' },
      SourceLanguageSummary: { SourceLanguageSummary: 'Summary' },
      SourceMediaPlayer: { SourceMediaPlayer: 'Player' },
      transcriptService: {},
    })('pages/TranscriptPage.tsx').TranscriptPage
    const wrapper = Page()
    assert.equal(typeof wrapper.type, 'function', 'A blocked translation must not prevent transcript review')
    const tree = h.render(() => wrapper.type(wrapper.props))
    const button = find(tree, node => node.type === 'Button' && text(node) === 'Tiếp tục đến bản dịch')
    assert.equal(button.props.disabled, !confirmed)
    const panel = find(tree, node => node.type === 'ConfirmSource')
    assert.equal(Boolean(panel), !confirmed)
    if (panel) assert.equal(panel.props.disabled, false)
  }
})

test('source controls use labels, flexible token layout and no animation; nullable project list never crashes', () => {
  const load = loader()
  const list = load('features/projects/projectListPresentation.ts')
  assert.match(list.projectListLanguagePair(project), /Chưa xác định/)
  const css = readFileSync(resolve(root, 'styles/source-language.css'), 'utf8')
  assert.match(css, /focus-visible/); assert.match(css, /min-height: 44px/); assert.match(css, /flex-wrap: wrap/)
  assert.match(css, /max-width: 480px/); assert.doesNotMatch(css, /animation:|transition:|[;{]\s*width: \d{3,}px/)
})

test('translation route blocks unconfirmed source before workspace/preflight; legacy vi -> en retains existing workspace', () => {
  const base = { ...common,
    'react-router-dom': { Link: 'Link', useParams: () => ({ projectId: project.id }), useSearchParams: () => [new URLSearchParams()] },
    useTranslationEditor: {}, TranslationSegmentRow: {}, GroupTranslationWorkspace: { GroupTranslationWorkspace: 'GroupWorkspace' },
    TranslationSourcePreflight: { TranslationSourcePreflight: 'SourcePreflight' }, CustomerSimplePreflight: { CustomerSimplePreflight: 'SimplePreflight' },
  }
  const blocked = loader({ ...base, useProjects: { useProject: () => ({ project, isLoading: false }) } })('pages/TranslationPage.tsx').TranslationPage()
  assert.match(text(blocked), /Cần xác nhận ngôn ngữ nguồn/); assert.equal(find(blocked, node => node.type === 'SourcePreflight'), undefined)
  const legacy = { ...project, sourceLanguage: 'vi', sourceLanguageMode: undefined, sourceLanguageStatus: undefined,
    workflow: { ...project.workflow, state: 'READY', canResume: true } }
  const allowed = loader({ ...base, useProjects: { useProject: () => ({ project: legacy, isLoading: false }) } })('pages/TranslationPage.tsx').TranslationPage()
  assert.ok(find(allowed, node => node.type === 'SourcePreflight'))
})
