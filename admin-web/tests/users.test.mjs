import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('users loading keeps last API summary, aborts stale reads, retries the same query', async () => {
  const source = readFileSync(new URL('../src/hooks/useAdminCustomers.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const states = [], calls = []; let cursor = 0, previousDeps, cleanup;
  const exports = {};
  runInNewContext(code, { exports, AbortController, require: key => key === 'react' ? {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useEffect(effect, deps) {
      if (!previousDeps || deps.some((d, i) => d !== previousDeps[i])) { cleanup?.(); previousDeps = deps; cleanup = effect(); }
    },
  } : { adminCustomerService: { getCustomers(query) { return new Promise((resolve, reject) => calls.push({ query, resolve, reject })); } } } });
  const render = filters => { cursor = 0; return exports.useAdminCustomers(filters); };
  const filters = { search: '', status: 'ALL', sort: 'NEWEST', page: 1, limit: 10 };
  const summary = { total: 1000, active: 500, blocked: 500, newCustomers: 2 };
  const payload = { summary, items: [], pagination: { page: 1, totalPages: 100, total: 1000, limit: 10 } };
  assert.equal(render(filters).loading, true);
  calls[0].resolve(payload); await new Promise(setImmediate);
  assert.equal(render(filters).data, payload);
  const changed = { ...filters, search: 'new', status: 'ACTIVE', sort: 'NAME_ASC', page: 2 };
  const loading = render(changed);
  assert.equal(loading.data, null);
  assert.equal(loading.summary, summary);
  assert.equal(loading.loading, true);
  const newer = { ...changed, search: 'latest' };
  render(newer);
  assert.equal(calls[1].query.signal.aborted, true);
  calls[1].resolve({ ...payload, summary: { total: 99 } }); await new Promise(setImmediate);
  assert.equal(render(newer).data, null, 'stale result cannot replace current filters');
  calls[2].reject(Error('offline')); await new Promise(setImmediate);
  const failed = render(newer);
  assert.equal(failed.error, true);
  assert.equal(failed.summary, summary, 'unavailable counts must not become zero');
  failed.retry(); render(newer);
  for (const k of ['search', 'status', 'sort', 'page', 'limit']) assert.equal(calls[3].query[k], newer[k]);
  calls[3].resolve(payload); await new Promise(setImmediate);
  assert.equal(render(newer).error, false);
  cleanup?.();
});
