import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { grant, owner } from './controlled-execution/fixtures.js';
import { readPermitStatus } from '../src/services/translation/permit-status.js';
import { digest } from '../src/services/translation/group-plan.js';
import type { OneUsePermit, OneUsePermitFence } from '../src/services/translation/one-use-permit.js';
import type { GroupAdmission } from '../src/services/translation/group-admission.js';

// No dotenv/dev URI, Mongo connection, credentials or external provider transport.
process.env.NODE_ENV = 'development'; process.env.CONTROLLED_PROVIDER_MODE = 'PERMIT';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/no-connection-mocked-only';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex'); process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d';
process.env.GEMINI_API_KEY = ''; process.env.OPENAI_API_KEY = ''; process.env.GROUP_TRANSLATION_ENABLED = 'false';
const { readExecutionStatus } = await import('../src/controlled-development/execution-status.js');
const { executionApp } = await import('../src/controlled-development/execution-app.js');
const { User } = await import('../src/models/User.js');
const { Project } = await import('../src/models/Project.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const permit = () => ({ ...grant(), thinking: 'MEDIUM' }) as OneUsePermit;

for (const variant of ['unused', 'missing-binding', 'metadata-spent', 'generation-spent', 'invalid-binding', 'invalid-claim', 'expired', 'orphan-verified']) {
  test(`read-only permit evidence: ${variant}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'synthetic-status-'));
    const p = permit();
    try {
      if (variant !== 'missing-binding') await writeFile(join(directory, `${p.id}.binding`), variant === 'invalid-binding' ? 'x'.repeat(64) : digest(p));
      if (variant === 'metadata-spent' || variant === 'generation-spent') await writeFile(join(directory, `${p.id}.${variant}`), 'SPENT_OR_UNCERTAIN');
      if (variant === 'invalid-claim') await writeFile(join(directory, `${p.id}.metadata-spent`), 'partial');
      if (variant === 'orphan-verified') await writeFile(join(directory, `${p.id}.metadata-verified`), 'VERIFIED');
      const before = await readdir(directory);
      const expected = variant.endsWith('-spent') ? 'REQUEST_CONSUMED' : variant === 'unused' ? 'UNUSED' : 'BLOCKED';
      assert.equal(await readPermitStatus(directory, p, variant === 'expired' ? p.expiresAt : Date.now()), expected);
      assert.deepEqual(await readdir(directory), before, 'status must not create, reset or remove permit evidence');
    } finally { await rm(directory, { recursive: true }); }
  });
}

const source = { revision: 1, digest: permit().sourceDigest, segmentCount: 1027, groupCount: 74, coverage: 1027 };
const admission = { operation: async (_owner: string, work: () => Promise<unknown>) => work(), responseScope: async (_owner: string, work: () => Promise<unknown>) => work(), snapshot: () => ({ active: 0, reservedCredits: 0 }) } as unknown as GroupAdmission;
function fence(state = 'UNUSED', thinking = 'MEDIUM') {
  return { permit: { ...permit(), thinking }, readStatus: async () => state, assertUsable: () => {} } as unknown as OneUsePermitFence;
}
test('authenticated-ready contract is observation only: MEDIUM, exact scope, no secrets, generation still disabled', async () => {
  let checks = 0;
  const result = await readExecutionStatus(fence(), admission, async () => { checks++; return source; });
  assert.equal(result.state, 'READY'); assert.equal(result.generationEnabled, false); assert.equal(checks, 1);
  assert.equal('scope' in result && result.scope.thinking, 'MEDIUM');
  for (const privateKey of ['ownerId', 'permitId', 'apiKey', 'jwt', 'inputDigest', 'planDigest']) assert.ok(!JSON.stringify(result).includes(privateKey));
});
test('missing/uncertain/consumed permit, thinking mismatch, stale source, incomplete coverage fail closed', async () => {
  for (const state of ['BLOCKED', 'REQUEST_CONSUMED']) {
    assert.equal((await readExecutionStatus(fence(state), admission, async () => { throw new Error('must not load'); })).state, state);
  }
  assert.equal((await readExecutionStatus(fence('UNUSED', 'LOW'), admission, async () => source)).state, 'BLOCKED');
  for (const changed of [{ ...source, revision: 2 }, { ...source, digest: 'a'.repeat(64) }, { ...source, coverage: 1 }]) assert.equal((await readExecutionStatus(fence(), admission, async () => changed)).state, 'BLOCKED');
  const failed = await readExecutionStatus(fence(), admission, async () => { throw new Error('private source failure'); });
  assert.equal(failed.state, 'BLOCKED'); assert.ok(!JSON.stringify(failed).includes('private'));
});
test('concurrent claim during status verification is observed, not rearmed', async () => {
  const f = fence(); let calls = 0;
  f.readStatus = async () => ++calls === 1 ? 'UNUSED' : 'REQUEST_CONSUMED';
  assert.equal((await readExecutionStatus(f, admission, async () => source)).state, 'REQUEST_CONSUMED');
});
test('16 concurrent status requests never call preview/metadata/generation/approve or consume a permit', async () => {
  const f = fence();
  const results = await Promise.all(Array.from({ length: 16 }, () => readExecutionStatus(f, admission, async () => source)));
  assert.ok(results.every(r => r.state === 'READY' && r.generationEnabled === false));
  assert.equal(await f.readStatus(), 'UNUSED');
});
test('status HTTP preserves JWT, CUSTOMER role, available-user, ownership and permit-owner scope', async t => {
  const p = permit(), other = 'f'.repeat(24), admin = 'e'.repeat(24), deleted = 'd'.repeat(24);
  t.mock.method(User, 'findOne', async (filter: any) => {
    assert.equal(filter.deletedAt, null);
    return filter._id === deleted ? null : new User({ _id: new Types.ObjectId(filter._id), fullName: 'Synthetic', email: 'synthetic@example.invalid', role: filter._id === admin ? 'ADMIN' : 'CUSTOMER', status: 'ACTIVE' });
  });
  t.mock.method(Project, 'findOne', (filter: any) => ({ select: async () => filter._id === p.projectId && filter.userId === owner ? { _id: new Types.ObjectId(p.projectId) } : null }));
  let draftReads = 0;
  const draftId = '11111111-1111-4111-8111-111111111111';
  const service = { readDraft: async (projectId: string, ownerId: string, id: string) => {
    assert.equal(projectId, p.projectId); assert.equal(ownerId, owner); assert.equal(id, draftId); draftReads++;
    return { draftId, projectId, state: 'DRAFT', alignmentFormat: 'GROUPS_V1', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ sourceText: 'Synthetic source', translatedText: 'Synthetic output' }] };
  } } as any;
  const server = executionApp(fence('REQUEST_CONSUMED'), service, admission, ['http://localhost:5173']).listen(0, '127.0.0.1');
  await once(server, 'listening'); const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/api/projects/${p.projectId}/translations/controlled-status`;
  const request = (id?: string, path = url) => fetch(path, { headers: id ? { Authorization: `Bearer ${signAccessToken(id, id === admin ? 'ADMIN' : 'CUSTOMER')}` } : {} });
  try {
    assert.equal((await request()).status, 401);
    assert.equal((await request(admin)).status, 403);
    assert.equal((await request(deleted)).status, 401);
    assert.equal((await request(other)).status, 404);
    assert.equal((await request(owner, url.replace(p.projectId, 'b'.repeat(24)))).status, 404);
    const response = await request(owner); assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { success: true, data: { state: 'REQUEST_CONSUMED', generationEnabled: false, reasonCode: 'CONTROLLED_REQUEST_CONSUMED' } });
    const draftUrl = url.replace('/controlled-status', `/drafts/${draftId}`);
    assert.equal((await request(undefined, draftUrl)).status, 401);
    assert.equal((await request(other, draftUrl)).status, 404);
    assert.equal((await request(admin, draftUrl)).status, 403);
    const draftResponse = await request(owner, draftUrl);
    assert.equal(draftResponse.status, 200);
    const body = await draftResponse.json();
    assert.equal(body.data.draft.state, 'DRAFT'); assert.equal(body.data.draft.groups[0].translatedText, 'Synthetic output');
    assert.equal(draftReads, 1, 'existing authenticated draft GET works without preview/approval/provider methods');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
