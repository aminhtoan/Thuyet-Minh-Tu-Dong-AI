import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { OneUsePermitFence } from '../../src/services/translation/one-use-permit.js';
import { ControlledGeminiProvider } from '../../src/services/translation/controlled-gemini.provider.js';
import { withPermittedSource } from '../../src/services/translation/controlled-development.js';
import { grant, input, owner, metadata, output } from './fixtures.js';

if (process.env.HOSTNAME !== 'narration-dispatch-durability' || process.env.NODE_ENV !== 'development' || process.env.CONTROLLED_PROVIDER_MODE !== 'PERMIT' || process.env.DISPATCH_MOCK_ONLY !== 'true' || ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'MONGODB_URI', 'JWT_ACCESS_SECRET'].some(key => !!process.env[key])) throw new Error('DURABILITY_TEST_ISOLATION_DENIED');
globalThis.fetch = async () => { throw new Error('REAL_NETWORK_FORBIDDEN'); };
const root = '/var/lib/narration-permits';
// Dedicated synthetic test directory ONLY, never the real execution permit volume.
const directory = `${root}/synthetic-dispatch-fixture`;
mkdirSync(directory, { recursive: true, mode: 0o700 });
const recordPath = `${directory}/test-run.json`;
const resumed = existsSync(recordPath);
const record = resumed ? JSON.parse(readFileSync(recordPath, 'utf8')) : { permit: { ...grant(), thinking: 'MEDIUM' }, calls: 0, boots: 0 };
assert.equal(record.permit.thinking, 'MEDIUM'); // Never rewrite/rearm an existing binding.
record.boots++;
const fence = await OneUsePermitFence.open(directory, record.permit);
const provider = new ControlledGeminiProvider(fence, 'synthetic-never-real-key', async () => {}, async (_url, init) => {
  if (init?.method === 'POST') assert.equal(JSON.parse(String(init.body)).generationConfig.thinkingConfig.thinkingLevel, 'MEDIUM');
  record.calls++; writeFileSync(recordPath, JSON.stringify(record), { mode: 0o600 });
  return init?.method === 'POST' ? output() : metadata();
});
if (!resumed) {
  await withPermittedSource(fence, owner, () => provider.translate(input)); assert.equal(record.calls, 2);
} else {
  await assert.rejects(withPermittedSource(fence, owner, () => provider.translate(input))); assert.equal(record.calls, 2);
  await assert.rejects(fence.generation(record.permit.model, input, async () => {}, async () => { record.calls++; return {}; })); assert.equal(record.calls, 2);
}
writeFileSync(recordPath, JSON.stringify(record), { mode: 0o600 });
writeFileSync('/tmp/durability-ready.json', JSON.stringify({ boots: record.boots, calls: record.calls, resumed, thinking: record.permit.thinking }), { mode: 0o600 });
console.log(`DURABILITY_PASS boots=${record.boots} mockSdkFetches=${record.calls}; real provider calls=0`);
setInterval(() => {}, 60000); // Operator restarts this exact test container; no background provider work.
