import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

function compile(file, imports = {}) {
  const exports = {};
  const modules = { ...imports };
  runInNewContext(
    ts.transpileModule(read('../src/' + file), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    {
      exports,
      require: (name) => modules[name] || {},
      fetch: globalThis.fetch,
      Response: globalThis.Response,
      JSON,
    }
  );
  return exports;
}

test('mobile trackListen fires POST /api/analytics/listen with platform mobile and fails safely', async () => {
  const originalFetch = globalThis.fetch;
  let calledUrl = '';
  let calledBody = '';

  try {
    globalThis.fetch = async (url, init) => {
      calledUrl = String(url);
      calledBody = String(init?.body);
      return new Response(JSON.stringify({ success: true, data: { tracked: true } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const { trackListen } = compile('services/analyticsService.ts', {
      '../config/env': { env: { apiBaseUrl: 'http://localhost:8080/api' } },
      '../lib/api': { session: { get: async () => null } },
    });

    await trackListen({
      projectId: '660000000000000000000001',
      narrationId: '660000000000000000000002',
      languageCode: 'en',
    });

    assert.ok(calledUrl.endsWith('/analytics/listen'));
    const parsed = JSON.parse(calledBody);
    assert.equal(parsed.platform, 'mobile');
    assert.equal(parsed.projectId, '660000000000000000000001');
    assert.equal(parsed.narrationId, '660000000000000000000002');
    assert.equal(parsed.languageCode, 'en');

    // Fails safely without throwing error to caller
    globalThis.fetch = async () => {
      throw new Error('Network disconnected');
    };
    await assert.doesNotReject(trackListen());
  } finally {
    globalThis.fetch = originalFetch;
  }
});
