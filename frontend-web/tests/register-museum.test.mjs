import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
function renderPage(page, formName) {
  const exports = {}
  runInNewContext(ts.transpileModule(read(`pages/${page}.tsx`), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: name => name.endsWith('.css') ? {} : name === 'react-router-dom' ? { Link: ({ to, children }) => React.createElement('a', { href: to }, children) }
      : name.endsWith(formName) ? { [formName]: () => React.createElement('form', { 'data-existing-form': formName }) } : require(name),
  })
  return renderToStaticMarkup(React.createElement(exports[page]))
}

test('Register matches the exact Login photo, overlay primitives and brand icon', () => {
  const login = renderPage('LoginPlaceholder', 'LoginForm')
  const register = renderPage('RegisterPlaceholder', 'RegisterForm')
  const photo = html => html.slice(html.indexOf('<section class="login-museum__photo"'))
  assert.equal(photo(register), photo(login))
  const brand = html => html.slice(html.indexOf('<div class="login-museum__brand">'), html.indexOf('<div class="login-museum__card">'))
  assert.equal(brand(register), brand(login))
  assert.doesNotMatch(register, /Người kể chuyện AI/)
  assert.equal((register.match(/<h1\b/g) || []).length, 1)
  assert.match(register, /<h1 id="register-heading">Đăng ký<\/h1>/)
})

test('Register places existing form and login link inside the shared white card', () => {
  const html = renderPage('RegisterPlaceholder', 'RegisterForm')
  assert.match(html, /data-existing-form="RegisterForm"/)
  assert.ok(html.indexOf('data-existing-form') > html.indexOf('login-museum__card'))
  assert.ok(html.indexOf('href="/login"') > html.indexOf('data-existing-form'))
  const source = read('pages/RegisterPlaceholder.tsx')
  assert.doesNotMatch(source, /authService|fetch\(|useEffect|onSubmit/)
  assert.match(source, /styles\/login.css/)
  const form = read('features/auth/RegisterForm.tsx')
  assert.match(form, /Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số\./)
  assert.match(form, /submitLock.current/)
})

test('Register-only layout rules retain 42/58, tablet/mobile reflow and natural card height', () => {
  const css = read('styles/register.css')
  assert.match(css, /42fr\) minmax\(0, 58fr\)/)
  assert.match(css, /min-height: 100svh/)
  assert.match(css, /max-width: 1023px/)
  assert.match(css, /max-width: 767px/)
  assert.match(css, /auth-form \{ gap: 14px/)
  assert.doesNotMatch(css, /\.login-page|overflow: hidden|(?:^|;)\s*height:|transform:|zoom:/)
})

test('Register contrast colors remain scoped and focused/error borders override neutral fields', () => {
  const css = read('styles/register.css')
  assert.match(css, /background: #E9EDF7/)
  assert.match(css, /background: #FFFFFF; border-color: #D8DEEC/)
  assert.match(css, /field__control \{ background: #F1F4FA; border-color: #D3DAE9/)
  assert.match(css, /field__label,[\s\S]*brand-name \{ color: #14213D/)
  assert.match(css, /field__control:focus-within \{ border-color: var\(--color-primary\); outline: 3px solid var\(--color-focus\)/)
  assert.match(css, /field__control:has\(input\[aria-invalid="true"\]\) \{ border-color: var\(--color-error\)/)
  assert.match(css, /max-height: 800px/)
  assert.match(css, /auth-form \{ gap: 14px/)
  assert.doesNotMatch(css, /\.login-page|login-museum__photo|login-museum__message|\.auth-form__submit/)
})

test('Register text colors meet normal-text contrast on specified surfaces', () => {
  const luminance = hex => {
    const channels = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
  }
  const contrast = (a, b) => { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05) }
  for (const [foreground, background] of [['14213D', 'FFFFFF'], ['14213D', 'E9EDF7'], ['14213D', 'F1F4FA'], ['59657A', 'F1F4FA'], ['5850EC', 'F1F4FA']]) {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground}/${background}`)
  }
})
