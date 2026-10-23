import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8')
function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map(node => find(node, predicate)).find(Boolean)
  if (!tree || typeof tree !== 'object') return undefined
  return predicate(tree) ? tree : find(tree.props?.children, predicate)
}
function harness() {
  let cursor = 0, params = new URLSearchParams(), requests = 0
  const slots = []
  const deps = {
    react: {
      useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
      useMemo(fn, dependencies) { const i = cursor++; if (!slots[i] || dependencies.some((d, k) => !Object.is(d, slots[i].deps[k]))) slots[i] = { deps: dependencies, value: fn() }; return slots[i].value },
    },
    'react-router-dom': { Link: 'link-test', useSearchParams: () => [params, next => { requests++; params = next }] },
    '../components/common/Input': { Input: 'input-test' }, '../components/common/Button': { Button: 'button-test' },
    '../components/common/Card': { Card: 'card-test' }, '../components/common/Icon': { Icon: 'icon-test' },
    '../components/common/ErrorState': { ErrorState: 'error-test' }, '../components/common/Spinner': { Spinner: 'spinner-test' },
    '../localization/statusLabels.mjs': { projectStatusLabels: { DRAFT: 'Nháp', COMPLETED: 'Hoàn tất' } },
    '../features/projects/projectListFilters': { filterAndSortProjects: projects => projects },
    '../features/results/historyFilters': { historyDateError: () => '' },
    '../features/results/useCompleteHistory': {}, '../features/projects/ProjectStatusBadge': {},
    '../features/projects/projectAction': {}, '../features/projects/projectDemo': {},
    '../features/projects/projectDataState': { hasIncompleteProjectMetadata: () => false },
    '../features/projects/projectListPresentation': { projectListPage: projects => ({ projects, page: 1, totalPages: 1 }) },
  }
  const exports = {}
  runInNewContext(ts.transpileModule(source.replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.VITE_PROJECT_LIST_DEMO', 'undefined') + '\nexport { ProjectListView };', { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, URLSearchParams, require: name => name.endsWith('.css') ? {} : Object.hasOwn(deps, name) ? deps[name] : require(name),
  })
  return {
    render() { cursor = 0; return exports.ProjectListView({ projects: [], isLoading: false, error: null, reload() {}, demo: false }) },
    get requests() { return requests }, get params() { return params },
  }
}

test('filters start closed, preserve draft across toggles and apply only on Search', () => {
  const h = harness(); let tree = h.render()
  const toggle = () => find(tree, n => n.props?.['aria-controls'] === 'project-list-advanced-filters')
  assert.equal(toggle().props['aria-expanded'], false)
  assert.equal(find(tree, n => n.props?.onClick?.name === 'resetDraftFilters'), undefined)
  toggle().props.onClick(); tree = h.render()
  find(tree, n => n.type === 'select' && n.props.value === 'ALL').props.onChange({ target: { value: 'WEEK' } })
  tree = h.render(); assert.equal(h.requests, 0)
  toggle().props.onClick(); tree = h.render(); toggle().props.onClick(); tree = h.render()
  assert.ok(find(tree, n => n.type === 'select' && n.props.value === 'WEEK'))
  find(tree, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
  tree = h.render(); tree = h.render()
  assert.equal(h.requests, 1); assert.equal(h.params.get('period'), 'WEEK'); assert.equal(h.params.get('page'), '1')
  assert.equal(toggle().props['aria-expanded'], false)
  assert.match(toggle().props['aria-label'], /1 bộ lọc nâng cao đang áp dụng/)
  toggle().props.onClick(); tree = h.render()
  find(tree, n => n.props?.onClick?.name === 'resetDraftFilters').props.onClick()
  tree = h.render(); assert.equal(h.requests, 1); assert.equal(h.params.get('period'), 'WEEK')
  assert.equal(find(tree, n => n.props?.onClick?.name === 'resetDraftFilters'), undefined)
  find(tree, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
  h.render(); tree = h.render(); assert.equal(h.params.get('period'), 'ALL')
  assert.equal(h.requests, 2)
  assert.ok(find(tree, n => n.props?.to === '/projects/new'))
})

test('compact table keeps six columns, focus-to-read full names and bounded scroll', () => {
  const css = readFileSync(new URL('../src/styles/project-list.css', import.meta.url), 'utf8')
  assert.equal((source.match(/<col className="project-list-column project-list-column--/g) || []).length, 6)
  assert.match(css, /tbody tr \{\s*height: 60px/)
  assert.match(css, /-webkit-line-clamp: 2/)
  assert.match(css, /project-list-name:focus \{[^}]*-webkit-line-clamp: unset/s)
  assert.match(css, /project-list-table-scroll \{[^}]*max-width: 100%;[^}]*overflow-x: auto/s)
  assert.match(css, /min-height: 46px/)
})
