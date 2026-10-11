import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { historyPageNumbers } from '../src/features/results/historyPagination.ts'
test('Numeric history pagination derives pages from total, not a hardcoded fixture count', () => {
  assert.deepEqual(historyPageNumbers(1, 1), [1])
  assert.deepEqual(historyPageNumbers(1, 2), [1, 2])
  assert.deepEqual(historyPageNumbers(2, 2), [1, 2])
  assert.deepEqual(historyPageNumbers(1, 20), [1, 2, 3, 4, '…', 20])
  assert.deepEqual(historyPageNumbers(10, 20), [1, '…', 9, 10, 11, '…', 20])
  assert.deepEqual(historyPageNumbers(20, 20), [1, '…', 17, 18, 19, 20])
  for (let page = 1; page <= 100; page++) {
    const numbers = historyPageNumbers(page, 100)
    assert.ok(numbers.includes(page)); assert.ok(numbers.length <= 7)
    assert.equal(numbers[0], 1); assert.equal(numbers.at(-1), 100)
  }
})
test('History numeric controls retain reset, disabled boundaries, summary and safe demo banner', async () => {
  const source = await readFile(new URL('../src/pages/HistoryPlaceholder.tsx', import.meta.url), 'utf8')
  assert.match(source, /onClick=\{\(\) => setPage\(number\)\}/)
  assert.match(source, /aria-current=\{number === currentPage \? 'page' : undefined\}/)
  assert.match(source, /disabled=\{currentPage <= 1\}/)
  assert.match(source, /disabled=\{currentPage >= totalPages\}/)
  assert.match(source, /setPage\(1\)/)
  assert.match(source, /Hiển thị \{pagination.from\}–\{pagination.to\} \/ \{pagination.total\} bản ghi/)
  assert.match(source, /không có kết quả AI thật và không thực hiện nghiệp vụ/)
  assert.doesNotMatch(source, /history-simulated/)
  assert.match(source, /Chỉ xem demo/)
})
