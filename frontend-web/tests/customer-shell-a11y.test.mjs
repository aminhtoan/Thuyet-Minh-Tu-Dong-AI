import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { getDrawerTabTarget } from '../src/components/layout/drawerFocus.mjs'

const require = createRequire(import.meta.url)
function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map(node => find(node, predicate)).find(Boolean)
  if (!tree || typeof tree !== 'object') return undefined
  return predicate(tree) ? tree : find(tree.props?.children, predicate)
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ')
  return typeof tree === 'string' ? tree : tree?.props ? text(tree.props.children) : ''
}

// Real component handlers/effects, with no browser session or API dependency.
function harness(component, { drawer = false, confirmed = true, logout = async () => {} } = {}) {
  let pathname = '/dashboard', cursor = 0, effects = [], tree, calls = 0
  const slots = [], frames = [], events = new Map(), focus = [], navigation = []
  const main = { focus() { assert.ok(!find(tree, n => n.props?.className === 'app-shell__body')?.props.inert); focus.push('main') } }
  const menu = { focus: () => focus.push('menu') }
  const items = [{ focus: () => focus.push('first'), hasAttribute: () => false }, { focus: () => focus.push('last'), hasAttribute: () => false }]
  const sidebar = { querySelector: () => items[0], querySelectorAll: () => items }
  const document = { body: { style: { overflow: '' } }, activeElement: items[1],
    addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) }
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }] },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial } },
    useCallback: fn => fn, useId: () => 'profile-test',
    useEffect(fn, deps) { const index = cursor++, previous = slots[index]; if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: fn() } }) },
  }
  const dependencies = {
    react, 'react-router-dom': { Link: 'a', Outlet: 'outlet', useLocation: () => ({ pathname }), useNavigate: () => (...args) => navigation.push(args) },
    './Sidebar': { Sidebar: 'sidebar-test' }, './Topbar': { Topbar: 'topbar-test' },
    '../../localization/navigationLabels.mjs': { navigationLabels: {} }, './drawerFocus.mjs': { getDrawerTabTarget },
    '../../features/auth/authService': { authService: { me: async () => ({ user: { fullName: 'Test' } }), logout: () => { calls++; return logout() } } },
    '../../features/auth/profileUpdate.mjs': { subscribeProfileUpdates: () => () => {} },
    '../../features/auth/profileIdentity.mjs': { getProfileIdentity: () => ({ name: 'Test', email: '', initial: 'T' }) },
    '../../localization/confirmationMessages.mjs': { confirmationMessages: { logout: 'Confirm' } }, '../common/Icon': { Icon: 'icon' },
  }
  const exports = {}
  const source = readFileSync(new URL(`../src/components/layout/${component}.tsx`, import.meta.url), 'utf8').replaceAll('import.meta.env.DEV', 'false')
  runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), document,
    window: { confirm: () => confirmed, matchMedia: () => ({ matches: drawer, addEventListener() {}, removeEventListener() {} }) },
    requestAnimationFrame: fn => { frames.push(fn); return frames.length }, cancelAnimationFrame() {},
  })
  return {
    render() {
      cursor = 0; effects = []
      tree = exports[component]({ menuButtonRef: { current: menu }, title: 'Test', onMenuClick() {}, sidebarOpen: false })
      const mainElement = find(tree, n => n.type === 'main'); if (mainElement) mainElement.props.ref.current = main
      const side = find(tree, n => n.type === 'sidebar-test'); if (side) side.props.asideRef.current = sidebar
      const top = find(tree, n => n.type === 'topbar-test'); if (top) top.props.menuButtonRef.current = menu
      const profile = find(tree, n => n.props?.className === 'topbar-profile'); if (profile) profile.props.ref.current = { contains: () => false, querySelector: () => items[0] }
      effects.forEach(fn => fn()); return tree
    },
    path(value) { pathname = value }, flushFrames() { frames.splice(0).forEach(fn => fn()) },
    events, document, focus, navigation, get calls() { return calls },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) },
  }
}

test('skip link focuses main; route changes focus once, initial mount does not steal focus', () => {
  const h = harness('AppShell')
  let tree = h.render()
  assert.deepEqual(h.focus, [])
  const skip = find(tree, n => n.props?.className === 'customer-skip-link')
  assert.equal(skip.props.href, '#customer-main')
  assert.equal(tree.props.children[0], skip)
  assert.equal(find(tree, n => n.type === 'main').props.tabIndex, -1)
  skip.props.onClick({ preventDefault() {} }); assert.deepEqual(h.focus, ['main'])
  h.path('/projects'); tree = h.render(); h.render()
  assert.deepEqual(h.focus, ['main', 'main'])
  h.unmount()
})

test('drawer navigation focuses non-inert content, including same-route clicks; Escape restores trigger', () => {
  for (const sameRoute of [false, true]) {
    const h = harness('AppShell', { drawer: true })
    let tree = h.render()
    find(tree, n => n.type === 'topbar-test').props.onMenuClick(); tree = h.render(); h.flushFrames()
    assert.equal(h.document.body.style.overflow, 'hidden')
    assert.equal(find(tree, n => n.props?.className === 'customer-skip-link').props.inert, true)
    h.events.get('keydown')({ key: 'Tab', preventDefault() {}, shiftKey: false })
    assert.equal(h.focus.at(-1), 'first')
    find(tree, n => n.type === 'sidebar-test').props.onNavigate()
    if (!sameRoute) h.path('/projects')
    tree = h.render(); h.flushFrames()
    assert.equal(h.focus.at(-1), 'main'); assert.ok(!h.focus.includes('menu'))
    assert.equal(h.document.body.style.overflow, '')
    find(tree, n => n.type === 'topbar-test').props.onMenuClick(); h.render(); h.flushFrames()
    h.events.get('keydown')({ key: 'Escape', preventDefault() {} }); h.render(); h.flushFrames()
    assert.equal(h.focus.at(-1), 'menu')
    h.unmount(); assert.equal(h.document.body.style.overflow, '')
  }
})

test('failed logout announces a safe error without navigation or automatic retry, even after menu closes', async () => {
  let reject
  const h = harness('Topbar', { logout: () => new Promise((_, failure) => { reject = failure }) })
  let tree = h.render()
  find(tree, n => n.props?.className === 'topbar-profile__trigger').props.onClick(); tree = h.render()
  const button = find(tree, n => n.type === 'button' && n.props.role === 'menuitem')
  button.props.onClick(); button.props.onClick(); assert.equal(h.calls, 1)
  reject(new Error('SECRET_RESPONSE_MUST_NOT_RENDER')); await new Promise(setImmediate)
  tree = h.render()
  assert.match(text(find(tree, n => n.props?.role === 'alert')), /Chưa xác nhận được việc đăng xuất trên máy chủ/)
  assert.ok(!text(tree).includes('SECRET_RESPONSE'))
  assert.equal(h.navigation.length, 0)
  const disabled = find(tree, n => n.type === 'button' && n.props.role === 'menuitem')
  assert.equal(disabled.props.disabled, true); disabled.props.onClick(); assert.equal(h.calls, 1)
  h.events.get('keydown')({ key: 'Escape' }); tree = h.render()
  assert.ok(find(tree, n => n.props?.role === 'alert'))
  assert.ok(find(tree, n => n.type === 'a' && n.props.to === '/login'))
  h.unmount()
})

test('logout success uses the existing service and destination; canceled confirmation makes no request', async () => {
  for (const confirmed of [false, true]) {
    const h = harness('Topbar', { confirmed })
    let tree = h.render()
    find(tree, n => n.props?.className === 'topbar-profile__trigger').props.onClick(); tree = h.render()
    find(tree, n => n.type === 'button' && n.props.role === 'menuitem').props.onClick()
    await new Promise(setImmediate); tree = h.render()
    assert.equal(h.calls, confirmed ? 1 : 0)
    assert.equal(h.navigation.length, confirmed ? 1 : 0)
    if (confirmed) assert.equal(h.navigation[0][0], '/login')
    assert.equal(find(tree, n => n.props?.role === 'alert'), undefined)
    h.unmount()
  }
})

test('shell CSS scopes skip-link, wrapping, disabled and reduced-motion to Customer', () => {
  const css = readFileSync(new URL('../src/styles/shell.css', import.meta.url), 'utf8')
  assert.match(css, /\.app-shell \.customer-skip-link[^}]*position: fixed;[^}]*max-width: calc\(100% - 32px\)[^}]*transform: translateY\(-200%\)/)
  assert.match(css, /\.app-shell \.customer-skip-link:focus \{ transform: translateY\(0\)/)
  assert.match(css, /\.app-shell \.button[^}]*white-space: normal; line-height: 1.45/)
  assert.match(css, /\.app-shell \.topbar__logout-error[^}]*grid-column: 1 \/ -1;[^}]*overflow-wrap: anywhere/)
  assert.match(css, /\.app-shell \.topbar-profile__item:disabled[^}]*cursor: not-allowed/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.app-shell \.button/)
  assert.doesNotMatch(css, /museum-/)
})
