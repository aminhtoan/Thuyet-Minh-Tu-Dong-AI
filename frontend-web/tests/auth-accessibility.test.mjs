import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { validateLoginValues, validateRegisterValues } from '../src/features/auth/authValidation.mjs'
import { getLoginErrorMessage, getRegisterErrorMessage } from '../src/features/auth/loginError.mjs'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
function compile(path, deps, globals = {}) {
  const exports = {}
  runInNewContext(ts.transpileModule(read(path), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: name => Object.hasOwn(deps, name) ? deps[name] : require(name), ...globals })
  return exports
}
function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map(node => find(node, predicate)).find(Boolean)
  if (!tree || typeof tree !== 'object') return undefined
  return predicate(tree) ? tree : find(tree.props?.children, predicate)
}
function formHarness(kind, request = async () => {}) {
  let cursor = 0, calls = 0
  const slots = [], frames = [], focus = [], navigation = []
  const connected = { value: true }
  const form = { get isConnected() { return connected.value }, querySelector: selector => ({ focus: () => focus.push(selector) }) }
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
  }
  const name = `${kind}Form`
  const exports = compile(`features/auth/${name}.tsx`, {
    react, 'react-router-dom': { useNavigate: () => (...args) => navigation.push(args), useLocation: () => ({ state: { returnUrl: '/projects?status=DRAFT' } }) },
    '../../components/common/Button': { Button: 'button' }, '../../components/common/Input': { Input: 'input-test' },
    '../../components/common/InlineMessage': { InlineMessage: 'message-test' }, './PasswordField': { PasswordField: 'password-test' },
    './authService': { authService: { login: values => { calls++; return request(values) }, register: values => { calls++; return request(values) } } },
    './validation': { validateLogin: validateLoginValues, validateRegister: validateRegisterValues }, './loginError.mjs': { getLoginErrorMessage, getRegisterErrorMessage },
  }, { requestAnimationFrame: fn => frames.push(fn) })
  return {
    render() { cursor = 0; return exports[name]() },
    change(name, value) { find(this.render(), node => node.props?.name === name).props.onChange({ target: { value } }) },
    submit() { return this.render().props.onSubmit({ preventDefault() {}, currentTarget: form }) },
    flush() { frames.splice(0).forEach(fn => fn()) }, focus, navigation, connected, get calls() { return calls },
  }
}

test('auth layout has exactly one task H1 and no empty description paragraph', () => {
  const { AuthLayout } = compile('components/layout/AuthLayout.tsx', { '../common/Icon': { Icon: () => null } })
  for (const title of ['Đăng nhập', 'Đăng ký']) {
    const html = renderToStaticMarkup(React.createElement(AuthLayout, { title, description: '', footer: 'Footer' }, 'Form'))
    assert.equal((html.match(/<h1\b/g) || []).length, 1)
    assert.ok(html.includes(`<h1>${title}</h1>`))
    assert.match(html, /<p class="auth-layout__slogan">/)
    assert.doesNotMatch(html, /<p><\/p>/)
  }
})

test('invalid forms focus the first visual field after render and retain entered values', async () => {
  for (const kind of ['Login', 'Register']) {
    const h = formHarness(kind)
    await h.submit(); h.render(); h.flush()
    assert.equal(h.focus.at(-1), `input[name="${kind === 'Login' ? 'email' : 'fullName'}"]`)
    assert.equal(h.calls, 0)
    if (kind === 'Register') h.change('fullName', 'Test User')
    h.change('email', 'test@example.com'); h.change('password', 'short')
    await h.submit(); let tree = h.render(); h.flush()
    assert.equal(h.focus.at(-1), 'input[name="password"]')
    assert.equal(find(tree, n => n.props?.name === 'email').props.value, 'test@example.com')
    assert.equal(find(tree, n => n.props?.name === 'password').props.value, 'short')
    assert.ok(find(tree, n => n.props?.name === 'password').props.error)
    h.change('password', 'ValidPass1')
    if (kind === 'Register') { h.change('confirmPassword', 'mismatch'); await h.submit(); tree = h.render(); h.flush(); assert.equal(h.focus.at(-1), 'input[name="confirmPassword"]') }
    h.change('email', 'bad'); await h.submit(); h.connected.value = false; const before = h.focus.length; h.flush(); assert.equal(h.focus.length, before)
  }
})

test('auth input error IDs are connected and password fields preserve names, autocomplete and visibility', () => {
  const { Input } = compile('components/common/Input.tsx', {})
  const { PasswordField } = compile('features/auth/PasswordField.tsx', { '../../components/common/Input': { Input }, '../../components/common/Icon': { Icon: () => null } })
  const html = renderToStaticMarkup(React.createElement(PasswordField, { name: 'password', label: 'Mật khẩu', autoComplete: 'current-password', error: 'Lỗi kiểm thử dài '.repeat(30), value: '', onChange() {} }))
  const id = html.match(/aria-describedby="([^"]+)"/)[1]
  assert.ok(html.includes(`id="${id}"`))
  assert.match(html, /aria-invalid="true"/)
  assert.match(html, /name="password"/)
  assert.match(html, /autoComplete="current-password"/)
  assert.match(html, /type="password"/)
  assert.match(html, /aria-label="Hiện mật khẩu"/)
})

test('pending auth submits remain single-flight and redirects remain unchanged', async () => {
  for (const kind of ['Login', 'Register']) {
    let resolve
    const h = formHarness(kind, () => new Promise(done => { resolve = done }))
    if (kind === 'Register') { h.change('fullName', 'Test User'); h.change('confirmPassword', 'ValidPass1') }
    h.change('email', 'test@example.com'); h.change('password', 'ValidPass1')
    const first = h.submit(); await h.submit()
    assert.equal(h.calls, 1)
    assert.equal(h.render().props['aria-busy'], true)
    assert.equal(find(h.render(), n => n.type === 'button').props.loading, true)
    resolve(); await first
    assert.equal(h.render().props['aria-busy'], false)
    assert.equal(h.navigation[0][0], kind === 'Login' ? '/projects?status=DRAFT' : '/login')
  }
})

test('request failures preserve fields, expose safe messages and never navigate', async () => {
  for (const kind of ['Login', 'Register']) {
    const h = formHarness(kind, async () => { throw new Error('PRIVATE_ERROR_DO_NOT_RENDER') })
    if (kind === 'Register') { h.change('fullName', 'Test User'); h.change('confirmPassword', 'ValidPass1') }
    h.change('email', 'test@example.com'); h.change('password', 'ValidPass1'); await h.submit()
    const tree = h.render(), message = find(tree, n => n.type === 'message-test')
    assert.equal(message.props.variant, 'error')
    assert.ok(!message.props.children.includes('PRIVATE_ERROR'))
    assert.equal(find(tree, n => n.props?.name === 'password').props.value, 'ValidPass1')
    assert.equal(h.navigation.length, 0)
  }
  assert.match(getRegisterErrorMessage({ code: 'EMAIL_ALREADY_EXISTS', status: 409 }), /Email đã được sử dụng/)
  assert.match(getRegisterErrorMessage({ status: 400 }), /Thông tin đăng ký không hợp lệ/)
  assert.match(getRegisterErrorMessage({ status: 503 }), /Máy chủ/)
  assert.match(getRegisterErrorMessage(new TypeError('secret')), /Không thể kết nối/)
  const { InlineMessage } = compile('components/common/InlineMessage.tsx', {})
  assert.match(renderToStaticMarkup(React.createElement(InlineMessage, { variant: 'error' }, 'Safe error')), /role="alert"/)
})

test('auth CSS has shrinkable tablet columns, shared rhythm, wrapping and scoped focus', () => {
  const css = read('styles/auth.css'), polish = css.split('/* S28.3:')[1]
  assert.ok(polish)
  assert.match(polish, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/)
  assert.match(polish, /auth-layout__form-card[^}]*width: min\(100%, 27rem\)/)
  assert.match(polish, /field__message[^}]*overflow-wrap: anywhere/)
  assert.match(polish, /field__control:focus-within[^}]*outline: 3px solid/)
  assert.match(polish, /prefers-reduced-motion: reduce/)
  assert.doesNotMatch(polish, /line-clamp|nowrap|overflow-x: hidden/)
})
