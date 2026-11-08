import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const require = createRequire(import.meta.url);
const root = path.resolve('src');
function compile(file, overrides = {}, cache = new Map()) {
  const full = path.resolve(root, file);
  if (cache.has(full)) return cache.get(full);
  const exports = {}; cache.set(full, exports);
  const code = ts.transpileModule(readFileSync(full, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, { exports, URLSearchParams, require: key => {
    if (overrides[key]) return overrides[key];
    if (key === '../lib/api') throw new Error('Live API access is forbidden in this test');
    if (key.endsWith('.css')) return {};
    if (!key.startsWith('.')) return require(key);
    const base = path.resolve(path.dirname(full), key);
    const target = [base, `${base}.tsx`, `${base}.ts`].find(candidate => existsSync(candidate));
    if (!target) throw new Error(`Missing test dependency: ${key}`);
    return compile(path.relative(root, target), overrides, cache);
  } });
  return exports;
}
const render = (component, props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component, props)));
const date = '2026-11-08T02:00:00Z';
const project = (sourceLanguage, id = 'pending') => ({
  id, name: `Project ${id}`, user: null, sourceLanguage, targetLanguages: ['en'],
  description: '', status: 'UPLOADED', progress: 0, media: null, createdAt: date, updatedAt: date,
});

test('Dashboard renders null/missing AUTO source and preserves valid language codes and every project', async () => {
  for (const unknown of [null, undefined, '']) {
    const dto = {
      stats: { totalCustomers: 1, totalProjects: 2, processing: 0, failed: 0 },
      recentProjects: [project(unknown), project('vi', 'manual')], processingJobs: [], recentActivities: [],
      jobSummary: { queued: 0, processing: 0, completedToday: 0, failed: 0 }, generatedAt: date,
    };
    const before = JSON.stringify(dto);
    const { adminDashboardService } = compile('services/adminDashboardService.ts', {
      '../lib/api': { adminApi: async () => dto },
    });
    const data = await adminDashboardService.getDashboard();
    const { RecentProjectsCard } = compile('components/dashboard/RecentProjectsCard.tsx');
    const html = render(RecentProjectsCard, { projects: data.recentProjects, now: Date.parse(date) });
    assert.match(html, /Chưa xác định/);
    assert.match(html, /VI/);
    assert.match(html, /EN/);
    assert.match(html, /Project pending/);
    assert.match(html, /Project manual/);
    assert.equal(data.recentProjects.length, 2);
    assert.equal(data.recentProjects[0].sourceLanguage, unknown);
    assert.equal(JSON.stringify(dto), before);
  }
});

test('Project list and detail render unknown source without inventing a source or changing status', () => {
  for (const source of [null, undefined]) {
    const { mapProject } = compile('services/adminProjectService.ts', { '../lib/api': {} });
    const mapped = mapProject(project(source));
    const data = { items: [mapped], pagination: { page: 1, total: 1, limit: 10, totalPages: 1 } };
    const { AdminProjectsPage } = compile('pages/AdminProjectsPage.tsx', {
      '../hooks/useOperations': { useProjects: () => ({ data, loading: false, error: false, retry() {} }) },
      '../components/operations/NarrationApprovalModal': { NarrationApprovalModal: () => null },
    });
    assert.match(render(AdminProjectsPage), /Chưa xác định/);
    const { AdminProjectDetailPage } = compile('pages/AdminProjectDetailPage.tsx', {
      '../hooks/useOperations': { useProject: () => ({ data: { project: mapped, jobs: [] }, loading: false, error: false, retry() {} }) },
    });
    assert.match(render(AdminProjectDetailPage), /Chưa xác định/);
    assert.equal(mapped.sourceLanguage, source);
    assert.equal(mapped.status, 'UPLOADED');
  }
});

test('Customer detail preserves all AUTO/manual project rows using only its existing GET', async () => {
  const calls = [];
  const user = { id: 'fixture', fullName: 'Fixture', email: 'fixture@example.test', role: 'CUSTOMER', status: 'ACTIVE',
    avatarUrl: null, createdAt: date, updatedAt: date, projects: [project(null), project('ja', 'manual')] };
  const { adminCustomerService } = compile('services/adminCustomerService.ts', {
    '../lib/api': { adminApi: async (url, options) => { calls.push({ url, options }); return { user }; } },
  });
  const result = await adminCustomerService.getCustomerById('fixture');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/admin/users/fixture');
  assert.equal(calls[0].options.method, undefined);
  assert.equal(result.projectCount, 2);
  assert.equal(result.recentProjects[0].languagePair, 'Chưa xác định → EN');
  assert.equal(result.recentProjects[1].languagePair, 'JA → EN');
  assert.equal(user.projects[0].sourceLanguage, null);
});
