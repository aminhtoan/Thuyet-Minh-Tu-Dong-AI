import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'vite';

const envelope = data => new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } });

test('Admin services map real API contracts and runtime contains no mocks', async () => {
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    const path = new URL(String(url)).pathname + new URL(String(url)).search;
    if (path.includes('/admin/dashboard')) return envelope({ stats: { totalCustomers: 1, totalProjects: 2, processing: 0, failed: 0 }, recentProjects: [{ id: 'p1', name: 'P', user: { id: 'u1', fullName: 'A' }, sourceLanguage: 'vi', targetLanguages: ['en', 'ja'], status: 'COMPLETED', progress: 100, updatedAt: '2026-01-01' }], processingJobs: [], recentActivities: [], jobSummary: { queued: 0, processing: 0, completedToday: 1, failed: 0 }, generatedAt: '2026-01-01' });
    if (path.includes('/admin/users?')) return envelope({ items: [], summary: { total: 0, active: 0, blocked: 0, newCustomers: 0 }, pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    if (path.includes('/admin/settings')) return envelope({ editable: false, environment: 'test', upload: { maxSizeMb: 10, supportedMediaTypes: [] }, authentication: { accessTokenTtl: '15m', refreshTokenTtl: '7d' }, processing: { mode: 'synchronous', ffmpegBinarySource: 'system-path', ffprobeBinarySource: 'system-path', sttProviderConfigured: false, translationProviderConfigured: false, ttsProviderConfigured: false } });
    throw new Error(`Unexpected ${path}`);
  };
  const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-foundation-test', optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { adminDashboardService } = await server.ssrLoadModule('/src/services/adminDashboardService.ts');
    assert.deepEqual((await adminDashboardService.getDashboard()).recentProjects[0].targetLanguages, ['en', 'ja']);
    const { adminCustomerService } = await server.ssrLoadModule('/src/services/adminCustomerService.ts');
    assert.equal((await adminCustomerService.getCustomers({ page: 1, limit: 10, search: 'abc', status: 'ACTIVE', sort: 'NAME_ASC' })).pagination.total, 0);
    assert.ok(calls.some(x => x.includes('search=abc') && x.includes('status=ACTIVE') && x.includes('sort=NAME_ASC')));
    const { adminSettingsService } = await server.ssrLoadModule('/src/services/adminSettingsService.ts');
    const settings = await adminSettingsService.getSettings();
    assert.equal(settings.editable, false);
    assert.equal(JSON.stringify(settings).match(/secret|password|mongodb_uri|api_key/i), null);
    const files = await readdir(new URL('../src/', import.meta.url), { recursive: true });
    const codeFiles = files.filter(x => String(x).endsWith('.ts') || String(x).endsWith('.tsx'));
    assert.equal(codeFiles.some(x => String(x).toLowerCase().includes('mock')), false);
    const sources = await Promise.all(codeFiles.map(x => readFile(new URL(`../src/${x}`, import.meta.url), 'utf8')));
    assert.equal(sources.some(x => /dữ liệu mô phỏng|mock success|retryJob|cancelJob/.test(x)), false);
  } finally { await server.close(); }
});
