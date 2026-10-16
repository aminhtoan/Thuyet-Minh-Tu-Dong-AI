import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/styles/project-list.css', import.meta.url), 'utf8')
const dashboardFonts = await readFile(new URL('../src/styles/dashboard-fonts.css', import.meta.url), 'utf8')

test('Projects page owns a local presentation scope without changing its form or query flow', () => {
  assert.match(source, /<div className="projects-page">/)
  assert.match(source, /<form className="project-list-filters"/)
  assert.match(source, /setParams\(next, \{ replace: true \}\)/)
  assert.match(css, /^\.projects-page \{/m)
  assert.doesNotMatch(css, /^\.project-list-(?:filters|table|submit|dates|error)\b/m)
})

test('Projects page reuses the existing Be Vietnam Pro family without duplicating font assets', () => {
  assert.match(css, /--projects-font-family: 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif/)
  assert.match(css, /font-family: var\(--projects-font-family\)/)
  assert.equal((dashboardFonts.match(/font-family: 'Be Vietnam Pro'/g) ?? []).length, 3)
  assert.doesNotMatch(css, /@font-face|assets\/fonts|(?:regular|semibold|bold)\.ttf/)
})

test('Projects typography, spacing and card treatment follow the approved foundation', () => {
  for (const token of [
    '--projects-page-title-size: clamp(26px, 2vw, 28px)',
    '--projects-section-title-size: 19px',
    '--projects-body-size: 15px',
    '--projects-table-size: 14px',
    '--projects-secondary-size: 13px',
  ]) assert.ok(css.includes(token), `missing ${token}`)
  assert.match(css, /\.projects-page \.projects-panel \{[^}]*border-radius: 16px;[^}]*box-shadow: var\(--shadow-sm\)/s)
  assert.match(css, /\.projects-page \.project-list-filters \{[^}]*padding: 24px/s)
  assert.match(css, /\.projects-page \.project-list-toolbar \{[^}]*gap: 12px/s)
  assert.match(css, /\.projects-page \.project-pagination \{[^}]*gap: 16px;[^}]*padding: 16px 24px/s)
})

test('Projects responsive guards keep wide tables inside their own scroll region', () => {
  assert.match(css, /\.projects-page \.project-list-table-scroll \{[^}]*max-width: 100%;[^}]*overflow-x: auto/s)
  assert.match(css, /\.projects-page \.project-list-table \{[^}]*min-width: 920px/s)
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.projects-page \.project-list-toolbar \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*border-radius: 14px/)
})
