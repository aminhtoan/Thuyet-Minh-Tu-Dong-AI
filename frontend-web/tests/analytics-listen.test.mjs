import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(
    readFileSync(new URL(`../src/features/analytics/${file}`, import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  runInNewContext(source, {
    exports,
    require: (name) => dependencies[name] || {},
    JSON,
    fetch: globalThis.fetch,
    Response: globalThis.Response,
  });
  return exports;
}

test('trackListen fires POST /api/analytics/listen with platform web and does not throw on failure', async () => {
  const originalFetch = globalThis.fetch;
  let calledUrl = '';
  let calledBody = '';
  let calledHeaders = {};

  try {
    globalThis.fetch = async (url, init) => {
      calledUrl = String(url);
      calledBody = String(init?.body);
      calledHeaders = init?.headers || {};
      return new Response(JSON.stringify({ success: true, data: { tracked: true } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const { trackListen } = load('analyticsService.ts', {
      '../../config/env': { env: { apiBaseUrl: 'http://localhost:8080/api' } },
      '../../lib/api': { session: { get: () => null } },
    });

    await trackListen({
      projectId: '660000000000000000000001',
      narrationId: '660000000000000000000002',
      languageCode: 'vi',
    });

    assert.ok(calledUrl.endsWith('/analytics/listen'));
    const parsed = JSON.parse(calledBody);
    assert.equal(parsed.platform, 'web');
    assert.equal(parsed.projectId, '660000000000000000000001');
    assert.equal(parsed.narrationId, '660000000000000000000002');
    assert.equal(parsed.languageCode, 'vi');
    assert.equal(calledHeaders['content-type'], 'application/json');

    // Network failure is absorbed gracefully
    globalThis.fetch = async () => {
      throw new Error('Offline network error');
    };
    await assert.doesNotReject(trackListen({ platform: 'web' }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
