import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
test('Admin job audio uses configured API, bearer GET and Blob, without refresh or redirect', async () => {
  const exports = {}; const calls = []; let token = 'synthetic-token', mode = 'ok';
  const source = readFileSync(new URL('../src/services/adminJobAudio.ts', import.meta.url), 'utf8');
  const audio = new Blob(['synthetic'], { type: 'audio/mpeg' });
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => name.includes('/config/env') ? { environment: { apiBaseUrl: 'https://api-staging.example.invalid/api' } }
      : { adminSession: { get: () => token ? { accessToken: token } : null } },
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: mode !== 'denied', headers: new Headers({ 'content-type': mode === 'wrong-mime' ? 'application/json' : 'audio/mpeg' }), blob: async () => audio }; },
    Error,
  });
  const signal = new AbortController().signal;
  assert.equal(await exports.loadJobAudio('a'.repeat(24), signal), audio);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api-staging.example.invalid/api/admin/jobs/' + 'a'.repeat(24) + '/audio');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.headers.authorization, 'Bearer synthetic-token');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.signal, signal);
  await assert.rejects(exports.loadJobAudio('../other', signal));
  assert.equal(calls.length, 1);
  token = '';
  await assert.rejects(exports.loadJobAudio('a'.repeat(24), signal));
  assert.equal(calls.length, 1);
  token = 'synthetic-token';
  for (mode of ['denied', 'wrong-mime']) {
    const before = calls.length;
    await assert.rejects(exports.loadJobAudio('a'.repeat(24), signal));
    assert.equal(calls.length, before + 1, 'no retry or token refresh');
  }
});
