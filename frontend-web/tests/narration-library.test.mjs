import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { libraryProduct, filterLibrary } from '../src/features/results/libraryPresentation.ts'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const project = { id: 'mock-library', name: 'Thuyết minh tiếng Việt', status: 'COMPLETED', sourceLanguage: 'vi', updatedAt: '2026-10-23', workflow: { step: 'RESULT', state: 'COMPLETED', canResume: false, mediaType: 'VIDEO', targetLanguage: { code: 'en', source: 'RESULT' }, processing: null, failure: null, artifact: { resultReady: true, narrationReady: true } } }
test('library requires completed workflow and verified type-specific result evidence', () => {
  assert.equal(libraryProduct(project).language, 'en')
  assert.equal(libraryProduct(project).path, '/projects/mock-library/result?language=en')
  for (const status of ['DRAFT', 'PROCESSING_VIDEO', 'FAILED', 'TRANSCRIBED']) assert.equal(libraryProduct({ ...project, status }), null)
  assert.equal(libraryProduct({ ...project, workflow: undefined }), null)
  for (const state of ['BLOCKED', 'READY', 'PROCESSING', 'FAILED']) assert.equal(libraryProduct({ ...project, workflow: { ...project.workflow, state } }), null)
  assert.equal(libraryProduct({ ...project, workflow: { ...project.workflow, processing: { type: 'TTS' } } }), null)
  assert.equal(libraryProduct({ ...project, workflow: { ...project.workflow, artifact: { resultReady: false, narrationReady: true } } }), null)
  for (const source of ['JOB', 'TRANSLATION']) assert.equal(libraryProduct({ ...project, workflow: { ...project.workflow, targetLanguage: { code: 'en', source } } }), null)
})
test('audio uses narration evidence, never source language or fabricated thumbnails', () => {
  const audio = libraryProduct({ ...project, workflow: { ...project.workflow, mediaType: 'AUDIO', targetLanguage: { code: 'ko', source: 'NARRATION' }, artifact: { narrationReady: true, resultReady: false } } })
  assert.equal(audio.mediaType, 'AUDIO'); assert.equal(audio.language, 'ko')
  assert.equal(libraryProduct({ ...project, workflow: { ...project.workflow, targetLanguage: null } }), null)
})
test('library filters use only confirmed product media/language and trimmed names', () => {
  const products = [libraryProduct(project)]
  assert.equal(filterLibrary(products, { query: ' THUYẾT ', media: 'VIDEO', language: 'en' }).length, 1)
  for (const filter of [{ media: 'AUDIO' }, { language: 'vi' }, { query: 'không khớp' }]) assert.equal(filterLibrary(products, { query: '', media: 'ALL', language: 'ALL', ...filter }).length, 0)
})
test('library has responsive cards and safe states, no synthetic media or mutation dispatch', () => {
  const source = readFileSync(new URL('../src/pages/HistoryPlaceholder.tsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/styles/narration-library.css', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /<table|<img|createHistoryDemo|method:|generate\(/)
  assert.match(source, /Chưa có sản phẩm thuyết minh\./)
  assert.match(source, /to="\/projects\/new"/)
  assert.match(source, /to=\{item.path\}/)
  assert.match(source, /onRetry=\{reload\}/)
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(css, /repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(css, /max-width: 560px/)
  assert.match(css, /focus-visible/); assert.match(css, /prefers-reduced-motion/)
})

function renderLibrary(data) {
  const require = createRequire(import.meta.url), exports = {}
  const source = readFileSync(new URL('../src/pages/HistoryPlaceholder.tsx', import.meta.url), 'utf8')
  const deps = {
    react: { useMemo: fn => fn(), useState: initial => [initial, () => {}] },
    'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { ...props, href: to }, children) },
    '../features/results/useCompleteHistory': { useCompleteHistory: () => ({ projects: [], isLoading: false, error: null, reload() {}, ...data }) },
    '../features/results/libraryPresentation': { libraryProduct, filterLibrary },
    '../features/projects/projectUtils': { languageNames: { en: 'Tiếng Anh' } },
    '../components/common/Icon': { Icon: () => null },
    '../components/common/Spinner': { Spinner: () => React.createElement('span', null, 'Loading') },
    '../components/common/Card': { Card: ({ children }) => React.createElement('div', null, children) },
    '../components/common/Button': { Button: ({ children, ...props }) => React.createElement('button', props, children) },
    '../components/common/Input': { Input: ({ label }) => React.createElement('label', null, label) },
    '../components/common/EmptyState': { EmptyState: ({ title, description, action }) => React.createElement('section', null, title, description, action) },
    '../components/common/ErrorState': { ErrorState: ({ title }) => React.createElement('div', { role: 'alert' }, title) },
  }
  runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => name.endsWith('.css') ? {} : deps[name] ?? require(name) })
  return renderToStaticMarkup(React.createElement(exports.HistoryPlaceholder))
}
test('actual library page renders verified products only, empty/loading/error and incomplete evidence', () => {
  const html = renderLibrary({ projects: [project, { ...project, id: 'draft', name: 'Not a product', status: 'DRAFT' }] })
  assert.match(html, /Xem thuyết minh/); assert.match(html, /Tiếng Anh/)
  assert.match(html, /href="\/projects\/mock-library\/result\?language=en"/)
  assert.doesNotMatch(html, /Not a product|<table|<video|<audio/)
  assert.match(renderLibrary({}), /Chưa có sản phẩm thuyết minh\./)
  assert.match(renderLibrary({}), /href="\/projects\/new"/)
  assert.match(renderLibrary({ isLoading: true }), /Đang tải thư viện/)
  assert.match(renderLibrary({ error: 'mock error' }), /Không thể tải thư viện/)
  const unknown = renderLibrary({ projects: [{ ...project, workflow: undefined }] })
  assert.match(unknown, /Dữ liệu chưa đầy đủ/); assert.doesNotMatch(unknown, /href="\/projects\/mock-library\/result/)
})

test('library polish scopes compact empty state and fixed desktop search width without altering products', () => {
  const css = readFileSync(new URL('../src/styles/narration-library.css', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../src/pages/HistoryPlaceholder.tsx', import.meta.url), 'utf8')
  assert.match(page, /Card className="narration-library__empty"><EmptyState/)
  assert.match(css, /button\[type="submit"\] \{ width: 150px; max-width: 100%/)
  assert.match(css, /grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1fr\) 150px/)
  assert.match(css, /form:has\(label:nth-of-type\(2\)\)/)
  assert.match(css, /empty \.state \{ gap: 12px; padding: 16px; align-content: center/)
  assert.match(css, /max-width: 560px[^\n]*button\[type="submit"\] \{ width: 100%/)
  assert.doesNotMatch(css, /\.state\s*\{[^}]*height:|\.sidebar|\.topbar/)
})
