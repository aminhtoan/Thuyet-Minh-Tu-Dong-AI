import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const source = read('pages/LoginPlaceholder.tsx')
const exports = {}
runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
  exports,
  require: name => name.endsWith('.css') ? {} : name === 'react-router-dom' ? { Link: ({ to, children }) => React.createElement('a', { href: to }, children) }
    : name.endsWith('LoginForm') ? { LoginForm: () => React.createElement('form', { 'data-existing-login': true }) } : require(name),
})

test('museum login renders one task heading, new local brand and existing form before photo', () => {
  const html = renderToStaticMarkup(React.createElement(exports.LoginPlaceholder))
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
  assert.match(html, /<h1 id="login-heading">Chào mừng trở lại<\/h1>/)
  assert.match(html, /Thuyết minh bảo tàng/)
  assert.doesNotMatch(html, /Người kể chuyện AI/)
  assert.match(html, /Kết nối lịch sử qua nhiều ngôn ngữ\./)
  assert.match(html, /Ứng dụng AI hỗ trợ tạo và quản lý nội dung thuyết minh bảo tàng\./)
  assert.match(html, /href="\/register"/)
  assert.match(html, /aria-hidden="true"/)
  assert.ok(html.indexOf('data-existing-login') < html.indexOf('login-museum__photo'))
})

test('login and Register reuse the actual museum asset with independent existing forms', () => {
  assert.match(source, /src="\/museum\/images\/hero.jpg"/)
  assert.ok(existsSync(new URL('../public/museum/images/hero.jpg', import.meta.url)))
  assert.match(source, /alt="Mặt tiền Bảo tàng/)
  assert.doesNotMatch(source, /authService|fetch\(|useEffect|onSubmit/)
  const register = read('pages/RegisterPlaceholder.tsx')
  assert.match(register, /<RegisterForm \/>/)
  assert.match(register, /src="\/museum\/images\/hero.jpg"/)
  assert.match(read('components/layout/AuthLayout.tsx'), /Người kể chuyện AI/)
})

test('login-only CSS provides 42/58 desktop, tablet rebalance and form-first mobile', () => {
  const css = read('styles/login.css')
  assert.match(css, /42fr\) minmax\(0, 58fr\)/)
  assert.match(css, /object-fit: cover; object-position: 38% center/)
  assert.match(css, /linear-gradient/)
  assert.match(css, /max-width: 1023px/)
  assert.match(css, /max-width: 767px/)
  assert.match(css, /\.login-museum__photo \{ display: none; \}/)
  assert.match(css, /focus-visible/)
  assert.doesNotMatch(css, /\.register-page|\.auth-layout|zoom:|transform:/)
})

test('login card groups heading, existing form and register link below the external brand', () => {
  const html = renderToStaticMarkup(React.createElement(exports.LoginPlaceholder))
  const cardStart = html.indexOf('<div class="login-museum__card">')
  const photoStart = html.indexOf('<section class="login-museum__photo"')
  assert.ok(cardStart > html.indexOf('Thuyết minh bảo tàng'))
  const card = html.slice(cardStart, photoStart)
  assert.match(card, /Chào mừng trở lại/)
  assert.match(card, /data-existing-login/)
  assert.match(card, /href="\/register"/)
  assert.doesNotMatch(card, /login-museum__brand/)
  const css = read('styles/login.css')
  assert.match(css, /width: min\(100%, 420px\)/)
  assert.match(css, /background: #F5F7FB/)
  assert.match(css, /padding: 28px; background: #FFFFFF; border: 1px solid #E5EAF2; border-radius: 16px/)
  assert.match(css, /\.login-museum__card \{ padding: 24px; box-shadow:/)
  assert.match(css, /\.login-museum__card \{ padding: 20px;/)
})

test('compact auth primitives center the entire block and use readable, naturally expanding controls', () => {
  const css = read('styles/login.css')
  assert.match(css, /form-panel \{ display: grid; align-items: center; justify-items: center/)
  assert.match(css, /font-size: clamp\(28px, 2.1vw, 30px\)/)
  assert.match(css, /card \.field__control \{ min-height: 46px/)
  assert.match(css, /card \.field__input \{ min-height: 44px/)
  assert.match(css, /card \.password-toggle \{ width: 44px; height: 44px/)
  assert.match(css, /card \.auth-form__submit \{ min-height: 46px/)
  assert.match(css, /card \.auth-form \{ gap: 16px/)
  for (const selector of ['form-panel', 'content', 'card']) {
    const rules = [...css.matchAll(new RegExp(`\\.login-museum__${selector} \\{([^}]*)\\}`, 'g'))].map(match => match[1]).join(';')
    assert.doesNotMatch(rules, /transform:|position:\s*absolute|margin-left:|(?:^|;)\s*height:|overflow:\s*hidden/)
  }
})

test('login brand has a subordinate tagline and 20–22px navy name without changing card or photo', () => {
  const html = renderToStaticMarkup(React.createElement(exports.LoginPlaceholder))
  assert.match(html, /class="login-museum__brand-name">Thuyết minh bảo tàng<\/span>/)
  assert.match(html, /class="login-museum__brand-tagline">NỀN TẢNG ĐA NGÔN NGỮ<\/span>/)
  assert.match(html, /width="24" height="24"/)
  const css = read('styles/login.css')
  assert.match(css, /color: #121F3B; font-size: clamp\(20px, 1.6vw, 22px\); font-weight: 700/)
  assert.match(css, /brand-icon \{[^}]*flex: 0 0 48px; height: 48px/)
  assert.match(css, /brand-tagline \{ color: var\(--color-primary\); font-size: 11px/)
  assert.match(css, /brand-copy \{ display: grid; gap: 4px; min-width: 0/)
  assert.match(css, /brand \{[^}]*margin-bottom: 24px/)
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
})
