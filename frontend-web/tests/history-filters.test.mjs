import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultHistoryFilters, filterHistory, historyDateError } from '../src/features/results/historyFilters.ts';
const now = new Date(2026, 9, 11, 12);
const project = (name, day, status = 'COMPLETED') => ({ id: name, name, status, sourceLanguage: 'vi', createdAt: new Date(2026, 9, day, 12).toISOString(), updatedAt: now.toISOString() });
const items = [project('Giới thiệu', 11), project('Khác', 5, 'FAILED'), project('Cũ', 1)];
test('history filters apply trimmed case-insensitive name, status and date with AND', () => {
  assert.equal(filterHistory(items, { ...defaultHistoryFilters, query: ' GIỚI THIỆU ', status: 'COMPLETED', period: 'TODAY' }, now).length, 1);
  assert.equal(filterHistory(items, { ...defaultHistoryFilters, query: 'Giới thiệu', status: 'FAILED' }, now).length, 0);
});
test('history local calendar periods include correct boundaries', () => {
  for (const [period, count] of [['TODAY', 1], ['WEEK', 2], ['MONTH', 3], ['YEAR', 3]]) assert.equal(filterHistory(items, { ...defaultHistoryFilters, period }, now).length, count);
  assert.equal(filterHistory(items, { ...defaultHistoryFilters, period: 'CUSTOM', from: '2026-10-05', to: '2026-10-11' }, now).length, 2);
  const midnight = { ...items[0], createdAt: new Date(2026, 9, 12).toISOString() };
  assert.equal(filterHistory([midnight], { ...defaultHistoryFilters, period: 'TODAY' }, now).length, 0);
});
test('custom dates require both dates in chronological order and clearing restores all data', () => {
  assert.ok(historyDateError({ ...defaultHistoryFilters, period: 'CUSTOM' }));
  assert.ok(historyDateError({ ...defaultHistoryFilters, period: 'CUSTOM', from: '2026-10-12', to: '2026-10-11' }));
  assert.equal(historyDateError({ ...defaultHistoryFilters, period: 'CUSTOM', from: '2026-10-11', to: '2026-10-11' }), '');
  assert.equal(filterHistory(items, defaultHistoryFilters, now).length, 3);
});
