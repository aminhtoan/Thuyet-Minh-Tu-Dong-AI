import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { Types } from 'mongoose';
import { OneUsePermitFence } from '../../src/services/translation/one-use-permit.js';
import { withPermittedSource } from '../../src/services/translation/controlled-development.js';
import { controlledTarget } from './fixtures.js';
import { GroupAdmission } from '../../src/services/translation/group-admission.js';
import { owner, grant } from './fixtures.js';
process.env.NODE_ENV = 'development'; process.env.CONTROLLED_PROVIDER_MODE = 'PERMIT';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/no-connection-mocked-only';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex'); process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d';
process.env.GEMINI_API_KEY = ''; process.env.OPENAI_API_KEY = ''; process.env.GROUP_TRANSLATION_ENABLED = 'false';
const { executionApp } = await import('../../src/controlled-development/execution-app.js');
const { User } = await import('../../src/models/User.js');
const { Project } = await import('../../src/models/Project.js');
const { signAccessToken } = await import('../../src/utils/jwt.js');
test('execution HTTP fixture uses the current 96 KiB source policy', () => {
  assert.equal(controlledTarget.sourceBytes, 98304);
});
test('execution HTTP reuses real JWT/RBAC/ownership, scopes project/language, denies non-group routes and requires explicit approval', { skip: process.platform !== 'linux' }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'execution-http-'));
  const fence = await OneUsePermitFence.open(directory, grant());
  let calls = 0;
  const other = 'f'.repeat(24), admin = 'e'.repeat(24), deleted = 'd'.repeat(24);
  t.mock.method(User, 'findOne', async (filter: any) => {
    assert.equal(filter.deletedAt, null);
    if (filter._id === deleted) return null;
    return new User({ _id: new Types.ObjectId(filter._id), fullName: 'Synthetic only', email: 'synthetic@example.invalid', role: filter._id === admin ? 'ADMIN' : 'CUSTOMER', status: 'ACTIVE' });
  });
  t.mock.method(Project, 'findOne', (filter: any) => ({ select: async () => filter._id === controlledTarget.projectId && filter.userId === owner ? { _id: new Types.ObjectId(controlledTarget.projectId) } : null }));
  const admission = await withPermittedSource(fence, owner, async () => new GroupAdmission({ sourceBytes: controlledTarget.sourceBytes, requestCredits: 5242880, processCredits: 33554432, maxActive: 4, maxActivePerUser: 2 }));
  // Only this test's controller results are mocked; JWT and owner middleware are real.
  // No real GroupDraft, provider response or database mutation is created here.
  const service = { plan: async () => { calls++; return { synthetic: true }; }, preview: async () => { calls++; return { synthetic: true }; }, readDraft: async () => ({ synthetic: true }), approve: async () => { calls++; return { synthetic: true }; }, approved: async () => ({ synthetic: true }) } as any;
  const server = executionApp(fence, service, admission, ['http://localhost:5173']).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address() as { port: number };
  const request = async (path: string, id?: string, body?: unknown, review?: string) => fetch(`http://127.0.0.1:${address.port}${path}`, { method: body ? 'POST' : 'GET', headers: { ...(id ? { Authorization: `Bearer ${signAccessToken(id, id === admin ? 'ADMIN' : 'CUSTOMER')}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(review ? { 'X-Controlled-Review': review } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const base = `/api/projects/${controlledTarget.projectId}/translations`;
  try {
    assert.equal((await request(`${base}/plan/en`)).status, 401);
    assert.equal((await request(`${base}/plan/en`, other)).status, 404);
    assert.equal((await request(`${base}/plan/en`, admin)).status, 403);
    assert.equal((await request(`${base}/plan/en`, deleted)).status, 401);
    assert.equal((await request(`${base}/plan/en`, owner)).status, 200);
    assert.equal((await request(`${base}/plan/fr`, owner)).status, 403);
    assert.equal((await request(`/api/projects/${controlledTarget.projectId}/transcription`, owner, {})).status, 503);
    const preview = { targetLanguage: 'en', sourceRevision: controlledTarget.sourceDigest, groupingVersion: 'phrase-candidates-v1', groups: [['1'.repeat(24)]], idempotencyKey: fence.permit.id };
    assert.equal((await request(`${base}/preview`, owner, { ...preview, idempotencyKey: randomUUID() })).status, 409);
    assert.equal((await request(`${base}/preview`, owner, preview)).status, 200);
    const approve = { outputDigest: 'a'.repeat(64), reviewed: true };
    const path = `${base}/drafts/${randomUUID()}/approve`;
    assert.equal((await request(path, owner, approve)).status, 409);
    assert.equal((await request(path, owner, approve, approve.outputDigest)).status, 200);
    assert.equal(calls, 3); assert.equal(process.env.GROUP_TRANSLATION_ENABLED, 'false');
    assert.deepEqual(admission.snapshot(), { active: 0, reservedCredits: 0 });
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await rm(directory, { recursive: true }); }
});
