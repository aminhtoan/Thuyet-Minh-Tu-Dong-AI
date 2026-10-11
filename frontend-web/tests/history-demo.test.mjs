import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHistoryDemo, isHistoryDemoEnabled } from '../src/features/results/historyDemo.ts'
import { filterHistory, defaultHistoryFilters } from '../src/features/results/historyFilters.ts'
import { projectListPage } from '../src/features/projects/projectListPresentation.ts'
test('History demo is explicit DEV-only, independent of project flag and has no artifacts', () => {
  assert.equal(isHistoryDemoEnabled(false, 'true'), false)
  for (const flag of [undefined, 'false', true, '1']) assert.equal(isHistoryDemoEnabled(true, flag), false)
  assert.equal(isHistoryDemoEnabled(true, 'true'), true)
  const items = createHistoryDemo()
  assert.equal(items.length, 20)
  assert.equal(new Set(items.map(item => item.id)).size, 20)
  for (const item of items) { assert.match(item.id, /^ui-demo-history-/); assert.deepEqual(Object.keys(item).sort(), ['createdAt', 'description', 'id', 'name', 'sourceLanguage', 'status', 'updatedAt']) }
})
test('History fixtures filter all data with AND, dates and ten-record pagination', () => {
  const now = new Date(2026, 9, 11, 12), items = createHistoryDemo(now)
  assert.equal(filterHistory(items, { ...defaultHistoryFilters, query: ' DA NANG ' }, now).length, 1)
  assert.equal(filterHistory(items, { ...defaultHistoryFilters, query: 'DA NANG', status: 'FAILED' }, now).length, 0)
  for (const [period, count] of [['TODAY', 1], ['WEEK', 7], ['MONTH', 12]]) assert.equal(filterHistory(items, { ...defaultHistoryFilters, period }, now).length, count)
  const first = projectListPage(items, 1), second = projectListPage(items, 2)
  assert.deepEqual([first.from, first.to, second.from, second.to], [1, 10, 11, 20])
  assert.equal(projectListPage(items.slice(0, 1), 2).page, 1)
  assert.equal(projectListPage([], 2).total, 0)
})
test('History isolates demo API branch, preserves real detail route and no fake result action', async () => {
  const source = await readFile(new URL('../src/pages/HistoryPlaceholder.tsx', import.meta.url), 'utf8')
  assert.match(source, /import\.meta\.env\.DEV && isHistoryDemoEnabled.*VITE_HISTORY_DEMO/)
  assert.doesNotMatch(source, /VITE_PROJECT_LIST_DEMO|Xem kết quả|Xóa bộ lọc/)
  const branch = source.slice(source.indexOf('function DemoHistory'), source.indexOf('function HistoryView'))
  assert.doesNotMatch(branch, /useCompleteHistory|api\(/)
  assert.match(source, /demo \? <span className="history-readonly">Chỉ xem demo/)
  assert.match(source, /to=\{'\/projects\/' \+ project.id\}/)
  assert.match(source, /setPage\(1\)/)
})
