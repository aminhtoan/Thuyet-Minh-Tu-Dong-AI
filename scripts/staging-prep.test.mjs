import test from 'node:test';
import assert from 'node:assert/strict';
import { assertStagingFrontend, stagingRoutingBase } from './staging-frontend.mjs';
import { checkPreparation, verifyCandidate } from './check-staging-prep.mjs';

test('preparation is inert and all runtime prerequisites remain explicit', () => {
  assert.equal(checkPreparation().deploy, 'DISABLED');
  assert.equal(checkPreparation().isolation, 'NOT_VERIFIED');
});
test('frontend staging requires HTTPS and never accepts client secrets or local origins', () => {
  const valid = { VITE_API_BASE_URL: 'https://api-staging.example.invalid/api', VITE_APP_ORIGIN: 'https://customer-staging.example.invalid/', VITE_PUBLIC_MUSEUM_URL: 'https://customer-staging.example.invalid/' };
  assert.doesNotThrow(() => assertStagingFrontend('staging', valid, true));
  for (const url of ['', 'http://api.example.invalid/api', 'https://localhost/api', 'https://127.0.0.1/api', 'https://192.168.1.2/api', 'https://u:p@api.example.invalid/api', 'https://api.example.invalid/wrong']) {
    assert.throws(() => assertStagingFrontend('staging', { ...valid, VITE_API_BASE_URL: url }, true));
  }
  assert.throws(() => assertStagingFrontend('staging', { ...valid, VITE_JWT_SECRET: 'synthetic' }));
  assert.throws(() => assertStagingFrontend('staging', { ...valid, VITE_PUBLIC_MUSEUM_URL: undefined }, true));
  assert.doesNotThrow(() => assertStagingFrontend('development', {}));
});
test('staging routing base never masks an application localhost endpoint; development is untouched', () => {
  const code = 'new URL("http://localhost");fetch("http://localhost:8080/api")';
  const environment = { VITE_APP_ORIGIN: 'https://customer-staging.example.invalid/' };
  assert.equal(stagingRoutingBase('development', environment).renderChunk(code), null);
  const output = stagingRoutingBase('staging', environment).renderChunk(code).code;
  assert.ok(output.includes('new URL("https://customer-staging.example.invalid")'));
  assert.ok(output.includes('fetch("http://localhost:8080/api")'));
});
test('candidate input rejects shell expressions and partial refs before invoking git', () => {
  for (const value of ['main', '6689944', '--help', '$(whoami)', 'a'.repeat(40) + ';']) assert.throws(() => verifyCandidate(value));
});
