import assert from 'node:assert/strict';
import test from 'node:test';
import { filterAndSortProjects } from '../src/features/projects/projectListFilters.ts';
const filters = { query: '', period: 'ALL', status: 'ALL', from: '', to: '', sort: 'NEWEST' };
const projects = [{ id: 'a', name: 'Đà Nẵng', status: 'COMPLETED', createdAt: '2026-10-01T00:00:00Z' }, { id: 'b', name: 'An Giang', status: 'FAILED', createdAt: '2026-10-02T00:00:00Z' }];
test('project filters match Vietnamese without diacritics and combine status', () => {
  assert.equal(filterAndSortProjects(projects, { ...filters, query: ' DA NANG ', status: 'COMPLETED' }).length, 1);
  assert.equal(filterAndSortProjects(projects, { ...filters, query: 'da nang', status: 'FAILED' }).length, 0);
});
test('all four project sort orders apply before pagination without mutating data', () => {
  for (const [sort, id] of [['NEWEST', 'b'], ['OLDEST', 'a'], ['NAME_ASC', 'b'], ['NAME_DESC', 'a']]) assert.equal(filterAndSortProjects(projects, { ...filters, sort })[0].id, id);
  assert.equal(projects[0].id, 'a');
});
