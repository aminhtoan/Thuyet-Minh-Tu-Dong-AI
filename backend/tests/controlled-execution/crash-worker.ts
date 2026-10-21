import assert from 'node:assert/strict';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { OneUsePermitFence } from '../../src/services/translation/one-use-permit.js';
import { ControlledGeminiProvider } from '../../src/services/translation/controlled-gemini.provider.js';
import { withPermittedSource } from '../../src/services/translation/controlled-development.js';
import { grant, owner, input, metadata } from './fixtures.js';
if (process.env.HOSTNAME !== 'narration-dispatch-durability' || process.env.DISPATCH_MOCK_ONLY !== 'true' || process.env.NODE_ENV !== 'development' || ['GEMINI_API_KEY', 'MONGODB_URI', 'JWT_ACCESS_SECRET'].some(key => !!process.env[key])) throw new Error('CRASH_TEST_ISOLATION_DENIED');
globalThis.fetch = async () => { throw new Error('REAL_NETWORK_FORBIDDEN'); };
const directory = '/var/lib/narration-permits/synthetic-claim-crash-fixture';
mkdirSync(directory, { recursive: true, mode: 0o700 });
const recordPath = `${directory}/test-run.json`, resumed = existsSync(recordPath);
const record = resumed ? JSON.parse(readFileSync(recordPath, 'utf8')) : { permit: grant(), calls: 0, boots: 0 };
record.boots++; writeFileSync(recordPath, JSON.stringify(record), { mode: 0o600 });
const fence = await OneUsePermitFence.open(directory, record.permit);
const provider = new ControlledGeminiProvider(fence, 'synthetic-not-a-key', async () => {}, async (_url, init) => {
  // The durable generation-spent claim has ALREADY been fsynced by the adapter.
  // Kill the process before the stand-in for native POST dispatch executes.
  if (init?.method === 'POST') {
    writeFileSync('/tmp/claim-crash-armed', 'CLAIM_DURABLE_NO_POST', { mode: 0o600 });
    setInterval(() => {}, 60000); // Keep PID 1 alive until operator docker kill.
    await new Promise(() => {});
  }
  record.calls++; writeFileSync(recordPath, JSON.stringify(record), { mode: 0o600 }); return metadata();
});
if (!resumed) await withPermittedSource(fence, owner, () => provider.translate(input));
else {
  await assert.rejects(withPermittedSource(fence, owner, () => provider.translate(input)));
  await assert.rejects(fence.generation(record.permit.model, input, async () => {}, async () => { record.calls++; return {}; }));
  assert.equal(record.calls, 1); assert.ok(existsSync(`${directory}/${record.permit.id}.generation-spent`));
  writeFileSync('/tmp/claim-crash-ready.json', JSON.stringify({ boots: record.boots, calls: record.calls, generationSpent: true }), { mode: 0o600 });
  console.log('CLAIM_CRASH_RECOVERY_PASS; mock metadata=1; mock generation=0; real API calls=0');
  setInterval(() => {}, 60000);
}
