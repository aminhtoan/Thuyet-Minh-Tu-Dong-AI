import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/styles/project-list.css', import.meta.url), 'utf8')

test('advanced filters use an accessible disclosure and leave closed controls out of tab order', () => {
  assert.match(source, /const \[filtersOpen, setFiltersOpen\] = useState\(false\)/)
  assert.match(source, /aria-expanded=\{filtersOpen\}/)
  assert.match(source, /aria-controls="project-list-advanced-filters"/)
  assert.match(source, /aria-hidden=\{!filtersOpen\}/)
  assert.match(source, /inert=\{!filtersOpen \? true : undefined\}/)
  assert.match(source, /type="button"[\s\S]*onClick=\{\(\) => setFiltersOpen\(open => !open\)\}/)
})

test('submit keeps draft validation and writes the full existing URL contract on page one', () => {
  assert.match(source, /const message = historyDateError\(draft\)/)
  assert.match(source, /if \(message\) \{ setFiltersOpen\(true\); return \}/)
  for (const key of ['q', 'status', 'period', 'sort', 'from', 'to', 'page']) assert.match(source, new RegExp(`next\\.set\\('${key}'`))
  assert.match(source, /next\.set\('page', '1'\)/)
  assert.match(source, /setParams\(next, \{ replace: true \}\)[\s\S]*setFiltersOpen\(false\)/)
})

test('reset changes only the draft until the user submits', () => {
  const reset = source.slice(source.indexOf('const resetDraftFilters'), source.indexOf('const submitFilters'))
  assert.match(reset, /query: '', status: 'ALL', period: 'ALL', from: '', to: '', sort: 'NEWEST'/)
  assert.match(reset, /setValidationError\(''\)/)
  assert.doesNotMatch(reset, /setParams|filterAndSortProjects/)
  assert.match(source, /Đặt lại chỉ thay đổi lựa chọn đang soạn\. Nhấn Tìm kiếm để áp dụng\./)
})

test('custom dates remain conditional and every backend project status remains available', () => {
  assert.match(source, /draft\.period === 'CUSTOM' && <div className="project-list-dates"/)
  assert.match(source, /Object\.entries\(projectStatusLabels\)/)
  for (const status of ['DRAFT', 'UPLOADED', 'TRANSCRIBING', 'TRANSCRIBED', 'TRANSLATING', 'TRANSLATED', 'GENERATING_AUDIO', 'PROCESSING_VIDEO', 'COMPLETED', 'FAILED']) assert.ok(source.includes(`'${status}'`), `missing ${status}`)
  assert.match(source, /activeAdvancedFilterCount[\s\S]*đang áp dụng/)
})

test('toolbar is responsive, visibly focused and motion-safe', () => {
  assert.match(css, /\.projects-page \.project-list-toolbar \{[^}]*grid-template-columns: minmax\(280px, 1fr\) auto auto/s)
  assert.match(css, /\.projects-page \.project-list-filter-toggle:focus-visible \{[^}]*outline: 3px solid var\(--color-primary\)/s)
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)[\s\S]*\.project-list-search \{[^}]*grid-column: 1 \/ -1/s)
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*\.project-list-filter-count__copy \{[^}]*display: none/s)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none/)
})
