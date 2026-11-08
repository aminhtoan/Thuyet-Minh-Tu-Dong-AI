import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

for (const app of ['frontend-web', 'admin-web']) {
  const files = [resolve(app, 'dist/index.html'), ...readdirSync(resolve(app, 'dist/assets')).filter(name => name.endsWith('.js')).map(name => resolve(app, 'dist/assets', name))];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /https?:\/\/(?:localhost|127\.|192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.|\[::1\])/i, 'LOCAL_ENDPOINT_IN_STAGING_BUNDLE');
    assert.doesNotMatch(source, /-----BEGIN .*PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|mongodb(?:\+srv)?:\/\//, 'SENSITIVE_PATTERN_IN_STAGING_BUNDLE');
  }
  const combined = files.map(file => readFileSync(file, 'utf8')).join('\n');
  assert.match(combined, /STAGING_API_URL_REQUIRED/);
  console.log(app + ': staging bundle scan PASS (heuristic; manual review still required)');
}
