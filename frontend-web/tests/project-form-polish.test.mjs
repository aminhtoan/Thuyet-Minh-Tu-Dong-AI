import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
function compile(path, dependencies, globals = {}) {
  const exports = {}
  runInNewContext(ts.transpileModule(read(path), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: name => name.endsWith('.css') ? {} : Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), ...globals })
  return exports
}
const media = compile('features/projects/mediaUpload.ts', {})
const sourceLanguage = compile('features/projects/sourceLanguage.ts', {})
function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map(node => find(node, predicate)).find(Boolean)
  if (!tree || typeof tree !== 'object') return undefined
  return predicate(tree) ? tree : find(tree.props?.children, predicate)
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ')
  return typeof tree === 'string' ? tree : tree?.props ? text(tree.props.children) : ''
}
// Disposable in-memory component fixtures, no real upload, project or auth APIs.
function harness(page, { failSave = false, upload = async () => {}, mediaState = 'EMPTY', projectFields = {} } = {}) {
  const project = { id: 'test-only-id', name: 'Dự án kiểm thử', description: 'Mô tả', sourceLanguage: 'vi', status: 'DRAFT', workflow: { step: 'UPLOAD', state: 'READY', canResume: true }, ...projectFields }
  const slots = [], events = new Map(), writes = [], prompts = []
  let cursor = 0, effects = [], allowLeave = false, uploadCalls = 0
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, index) => !Object.is(value, old.deps[index]))) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) },
  }
  const dependencies = {
    react, 'react-router-dom': { Link: 'link-test', useParams: () => ({ projectId: project.id }), useLocation: () => ({ state: null }), useNavigate: () => () => {} },
    '../components/common/Button': { Button: 'button-test' }, '../components/common/Card': { Card: 'card-test' },
    '../components/common/Input': { Input: 'input-test' }, '../components/common/Icon': { Icon: 'icon-test' },
    '../components/common/Spinner': { Spinner: 'spinner-test' }, '../components/common/ProgressBar': { ProgressBar: 'progress-test' },
    '../components/common/ErrorState': { ErrorState: 'error-test' }, '../components/layout/PageHeader': { PageHeader: 'header-test' },
    '../components/common/WorkflowSteps': { WorkflowSteps: 'workflow-test' }, '../features/projects/ProjectStatusBadge': { ProjectStatusBadge: 'badge-test' },
    '../features/projects/mediaUpload': media, '../features/projects/languages': { languages: [{ code: 'vi', nativeName: 'Tiếng Việt' }] },
    '../features/projects/projectUtils': { sourceLanguageOptions: [{ value: 'vi', label: 'Tiếng Việt' }] },
    '../features/projects/sourceLanguage': sourceLanguage,
    '../features/projects/SourceLanguageSummary': { SourceLanguageSummary: 'source-summary-test' },
    '../features/projects/projectAction': { projectAction: () => ({ available: false, reason: 'Test only' }) },
    '../features/projects/projectDataState': { projectMetadataState: () => ({ media: mediaState }) },
    '../features/transcript/SourceMediaPlayer': { SourceMediaPlayer: 'source-player-test' },
    '../features/projects/useProjects': { useProject: () => ({ project, isLoading: false, error: null }) },
    '../features/projects/projectRepository': { projectRepository: { updateProject: async (...args) => { writes.push(args); if (failSave) throw new Error('Lưu thất bại kiểm thử') }, refresh: async () => {}, deleteProject: async () => { throw new Error('DELETE_NOT_ALLOWED_IN_TEST') } } },
    '../features/projects/uploadService': { uploadMediaToProject: async (...args) => { uploadCalls++; return upload(...args) }, uploadProjectMedia: async (...args) => { uploadCalls++; return upload(...args) } },
  }
  const exports = compile(`pages/${page}.tsx`, dependencies, {
    window: { confirm: message => { prompts.push(message); return allowLeave }, addEventListener: (event, fn) => events.set(event, fn), removeEventListener: event => events.delete(event) },
    AbortController, URL: { createObjectURL: () => 'blob:test-only', revokeObjectURL() {} },
  })
  return {
    render() { cursor = 0; effects = []; const tree = exports[page](); effects.forEach(fn => fn()); return tree },
    events, writes, prompts, get uploadCalls() { return uploadCalls }, allow() { allowLeave = true },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) },
  }
}

test('detail dirty state, unload warning, save success and explicit back confirmation are UI-only', async () => {
  const h = harness('ProjectDetailPage')
  h.render(); let tree = h.render()
  assert.equal(h.events.has('beforeunload'), false)
  find(tree, n => n.props?.id === 'project-detail-name').props.onChange({ target: { value: 'Đổi tên kiểm thử' } })
  tree = h.render(); assert.match(text(tree), /Có thay đổi chưa lưu/)
  let warned = false; h.events.get('beforeunload')({ preventDefault() { warned = true }, returnValue: null }); assert.ok(warned)
  const header = find(tree, n => n.type === 'header-test')
  const back = find(header.props.actions, n => n.type === 'link-test')
  let prevented = false; back.props.onClick({ preventDefault() { prevented = true } }); assert.ok(prevented)
  h.allow(); prevented = false; back.props.onClick({ preventDefault() { prevented = true } }); assert.equal(prevented, false)
  assert.equal(h.writes.length, 0)
  await find(tree, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
  tree = h.render(); assert.equal(h.writes.length, 1); assert.equal(h.writes[0][1].name, 'Đổi tên kiểm thử')
  assert.match(text(tree), /Đã lưu thay đổi dự án/); assert.doesNotMatch(text(tree), /Có thay đổi chưa lưu/)
  assert.equal(h.events.has('beforeunload'), false)
  h.unmount()
})

test('failed detail save retains unsaved fields and warning; returning to original clears dirty state', async () => {
  const h = harness('ProjectDetailPage', { failSave: true })
  h.render(); let tree = h.render()
  find(tree, n => n.props?.id === 'project-detail-description').props.onChange({ target: { value: 'Nội dung chưa lưu' } })
  tree = h.render(); await find(tree, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
  tree = h.render(); assert.match(text(tree), /Có thay đổi chưa lưu/); assert.match(text(tree), /Không thể cập nhật dự án/)
  assert.equal(find(tree, n => n.props?.id === 'project-detail-description').props.value, 'Nội dung chưa lưu')
  find(tree, n => n.props?.id === 'project-detail-description').props.onChange({ target: { value: 'Mô tả' } })
  h.render(); assert.equal(h.events.has('beforeunload'), false)
  h.unmount()
})

test('selected invalid file retains format guidance, linked error and never uploads', () => {
  for (const page of ['NewProjectPlaceholder', 'ProjectDetailPage']) {
    const h = harness(page); h.render(); let tree = h.render()
    const id = page === 'NewProjectPlaceholder' ? 'media-file' : 'resume-media-file'
    const file = { name: 'Tên_tệp_dài_'.repeat(20) + '.zip', type: 'application/zip', size: 1024 }
    find(tree, n => n.props?.id === id).props.onChange({ target: { files: [file], value: '' } })
    tree = h.render(); const input = find(tree, n => n.props?.id === id)
    assert.equal(input.props['aria-invalid'], true)
    assert.match(input.props['aria-describedby'], /error/)
    assert.match(text(tree), /500 MB/); assert.match(text(tree), /MP4, MOV, WEBM, MP3, WAV/)
    assert.ok(text(tree).includes(file.name)); assert.equal(h.uploadCalls, 0)
    h.unmount()
  }
})

test('new-project success keeps the existing list destination and clarifies the transcript next step', async () => {
  const h = harness('NewProjectPlaceholder')
  let tree = h.render()
  find(tree, n => n.type === 'input-test').props.onChange({ target: { value: 'Dự án kiểm thử' } })
  tree = h.render(); assert.equal(find(tree, n => n.props?.id === 'source-language-mode').props.value, 'AUTO')
  tree = h.render(); find(tree, n => n.props?.id === 'media-file').props.onChange({ target: { files: [{ name: 'test.mp4', size: 1024, type: 'video/mp4' }], value: '' } })
  tree = h.render()
  const start = find(tree, n => n.type === 'button-test' && text(n).includes('Tạo dự án'))
  assert.equal(start.props.disabled, false); await start.props.onClick()
  tree = h.render(); assert.equal(h.uploadCalls, 1)
  assert.match(text(tree), /Mở dự án vừa tạo trong danh sách để tiếp tục đến bước Bản ghi/)
  assert.equal(find(tree, n => n.type === 'link-test' && text(n).includes('Mở danh sách')).props.to, '/projects')
  h.unmount()
})

test('current validation limits, delete confirmation and responsive guards remain intact', () => {
  const create = read('pages/NewProjectPlaceholder.tsx'), detail = read('pages/ProjectDetailPage.tsx')
  assert.match(create, /maxLength=\{100\}/); assert.match(detail, /maxLength=\{150\}/)
  assert.equal(media.validateProjectName('ab'), 'Tên dự án phải có ít nhất 3 ký tự.')
  assert.equal(media.MAX_MEDIA_FILE_SIZE, 500 * 1024 * 1024)
  assert.match(detail, /window.confirm\(`Xóa dự án/)
  assert.match(detail, /uploadLock.current/); assert.match(detail, /saveLock.current/)
  assert.doesNotMatch(read('pages/ProjectsPlaceholder.tsx'), /menu bên trái/)
  for (const path of ['styles/upload.css', 'styles/project-detail.css']) {
    const css = read(path); assert.match(css, /overflow-wrap: anywhere/); assert.match(css, /@media \(max-width:/)
    assert.match(css, /input\[type="file"\]:focus-visible/)
  }
})

test('detail reuses the authenticated player only for verified audio/video metadata', () => {
  for (const mediaType of ['VIDEO', 'AUDIO']) {
    const h = harness('ProjectDetailPage', { mediaState: 'READY', projectFields: { mediaType, mediaSize: 1024, mediaName: 'Tệp nguồn thật' } })
    h.render(); const tree = h.render()
    const player = find(tree, n => n.type === 'source-player-test')
    assert.equal(player.props.projectId, 'test-only-id')
    assert.equal(player.props.mediaType, mediaType)
    assert.equal(player.props.metadataState, 'READY')
    assert.equal(player.props.mediaSize, 1024)
    assert.equal(player.props.src, undefined)
    assert.match(text(tree), /Tệp nguồn thật/)
    assert.equal(h.writes.length, 0); assert.equal(h.uploadCalls, 0)
    h.unmount()
  }
  for (const mediaState of ['EMPTY', 'UNKNOWN', 'LOADING', 'ERROR']) {
    const h = harness('ProjectDetailPage', { mediaState, projectFields: { mediaType: 'VIDEO' } })
    h.render(); const tree = h.render()
    assert.equal(find(tree, n => n.type === 'source-player-test'), undefined)
    if (mediaState === 'ERROR') assert.match(text(tree), /Không thể tải thông tin phương tiện/)
    h.unmount()
  }
})

test('delete is separate from save/continue and retains confirmation before any request', () => {
  const h = harness('ProjectDetailPage'); h.render(); const tree = h.render()
  const form = find(tree, n => n.type === 'form')
  assert.doesNotMatch(text(form), /Xóa dự án/)
  const danger = find(tree, n => n.props?.['aria-labelledby'] === 'project-delete-heading')
  assert.match(text(danger), /không thể hoàn tác/)
  find(danger, n => n.type === 'button-test').props.onClick()
  assert.equal(h.prompts.length, 1); assert.match(h.prompts[0], /Xóa dự án/)
  assert.equal(h.writes.length, 0)
  assert.equal(find(tree, n => n.type === 'workflow-test').props.pageStep, 'UPLOAD')
  h.unmount()
})
