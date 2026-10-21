import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
process.env.NODE_ENV = 'development'; process.env.GROUP_TRANSLATION_ENABLED = 'false';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/mocks-only';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex'); process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d';
const { prepareExecutionBinding, assertPreparedPermit } = await import('../src/controlled-development/execution-binding.js');
const { withPermittedSource, assertControlledRequest, assertControlledSource } = await import('../src/services/translation/controlled-development.js');
const { ControlledGeminiProvider } = await import('../src/services/translation/controlled-gemini.provider.js');
const { collectBoundedSource } = await import('../src/services/translation/bounded-source.js');
const { candidateGroups, revision, digest } = await import('../src/services/translation/group-plan.js');
const { grant } = await import('./controlled-execution/fixtures.js');
const owner = '1'.repeat(24), a = '2'.repeat(24), b = '3'.repeat(24), deployment = '4'.repeat(64);
const source = (id: string) => ({ transcriptId: id, transcriptRevision: id === a ? 2 : 7, languageCode: 'vi', fullText: 'Synthetic source only.', segments: [{ id: id === a ? '5'.repeat(24) : '6'.repeat(24), sequence: 1, text: 'Synthetic source only.', startTime: 0, endTime: 1 }] });
const dependencies = (patch = {}) => ({
  project: async (id: string, user: string) => [a, b].includes(id) && user === owner ? { status: 'TRANSCRIBED', sourceLanguage: 'vi' } : null,
  owner: async (id: string) => id === owner, language: async () => true,
  jobs: async () => null, translation: async () => null, drafts: () => 0,
  load: async (id: string) => source(id), current: async (id: string) => ({ revision: source(id).transcriptRevision }), ...patch,
}) as any;
const prepare = (id = a, deps = dependencies()) => prepareExecutionBinding(id, owner, deployment, undefined, deps);
const makeGrant = async (id = a) => {
  const binding = await prepare(id);
  return { ...grant(), ...Object.fromEntries(['ownerId', 'projectId', 'revision', 'sourceDigest', 'inputDigest', 'planDigest', 'sourceLanguage', 'targetLanguage', 'model', 'deploymentId'].map(k => [k, (binding as any)[k]])), thinking: 'MEDIUM' } as any;
};
test('two projects derive independent server bindings, arbitrary revision and exact ordered source hashes', async () => {
  const [ba, bb] = await Promise.all([prepare(a), prepare(b)]);
  assert.notEqual(ba.projectId, bb.projectId); assert.notEqual(ba.sourceDigest, bb.sourceDigest); assert.notEqual(ba.planDigest, bb.planDigest); assert.notEqual(ba.inputDigest, bb.inputDigest);
  for (const binding of [ba, bb]) {
    const s = source(binding.projectId), groups = candidateGroups(s);
    assert.equal(binding.sourceDigest, revision(s)); assert.equal(binding.planDigest, digest(groups.map(g => g.groupId)));
    assert.equal(binding.coverage, s.segments.length); assert.equal(binding.groupCount, 1); assert.ok(binding.sourceBytes <= 98304);
  }
  assert.equal(process.env.GROUP_TRANSLATION_ENABLED, 'false');
});
test('wrong customer/owner, unavailable language, jobs, persisted artifact and local draft block preparation', async () => {
  await assert.rejects(prepareExecutionBinding(a, '9'.repeat(24), deployment, undefined, dependencies()), (e: any) => e.code === 'PROJECT_NOT_FOUND');
  for (const patch of [{ owner: async () => false }, { jobs: async () => true }, { translation: async () => true }, { language: async () => false }, { drafts: () => 1 }]) await assert.rejects(prepare(a, dependencies(patch)));
});
test('source changes, invalid source order, and over-cap source fail before any fence/dispatch', async () => {
  await assert.rejects(prepare(a, dependencies({ current: async () => ({ revision: 99 }) })), (e: any) => e.code === 'SOURCE_REVISION_MISMATCH');
  await assert.rejects(prepare(a, dependencies({ load: async () => ({ ...source(a), fullText: 'x'.repeat(98305) }) })), (e: any) => e.code === 'TRANSLATION_DRAFT_TOO_LARGE');
  await assert.rejects(prepare(a, dependencies({ load: async () => ({ ...source(a), segments: [{ ...source(a).segments[0], sequence: 2 }] }) })));
});
test('pure pre-issuance validator rejects cross-project/owner/revision/digest/input/plan/deployment changes', async () => {
  const binding = await prepare(), p = await makeGrant();
  assert.equal(assertPreparedPermit(p, binding).projectId, a);
  assert.throws(() => assertPreparedPermit(p, { ...binding, projectId: b }));
  for (const patch of [{ ownerId: '9'.repeat(24) }, { revision: 10 }, { sourceDigest: '9'.repeat(64) }, { inputDigest: '9'.repeat(64) }, { planDigest: '9'.repeat(64) }, { deploymentId: '9'.repeat(64) }, { expiresAt: 1 }, { generationRequests: 2 }, { approval: 'UNAPPROVED' }]) assert.throws(() => assertPreparedPermit({ ...p, ...patch }, binding));
});
// Synthetic in-memory observation capability only. Never open() a real/synthetic
// durable fence here; no permit files, issuance or claims are created by this file.
function observationFence(p: any) { return { permit: Object.freeze(p), assertUsable: (id = p.ownerId) => { if (id !== p.ownerId || p.expiresAt <= Date.now()) throw new Error('DENIED'); } } as any; }
test('permit scope A cannot authorize B or another owner; source revision/digest checked independently', async () => {
  process.env.CONTROLLED_PROVIDER_MODE = 'PERMIT'; const p = await makeGrant(), f = observationFence(p);
  await withPermittedSource(f, owner, async () => {
    assert.doesNotThrow(() => assertControlledRequest(a, owner, 'en'));
    assert.throws(() => assertControlledRequest(b, owner, 'en'));
    assert.throws(() => assertControlledRequest(a, '9'.repeat(24), 'en'));
    assert.doesNotThrow(() => assertControlledSource(a, source(a)));
    assert.throws(() => assertControlledSource(a, { ...source(a), transcriptRevision: 8 }));
    assert.throws(() => assertControlledSource(a, { ...source(a), fullText: 'changed' }));
    await assert.rejects(collectBoundedSource({ transcriptId: a, transcriptRevision: 2, languageCode: 'vi', fullText: 'x' }, (async function* () {})(), 131072));
  });
  await assert.rejects(withPermittedSource(f, '9'.repeat(24), async () => {}));
  await assert.rejects(withPermittedSource(observationFence({ ...p, expiresAt: 1 }), owner, async () => {}));
});
test('no SDK or provider request outside explicit execution scope, including 16 concurrent attempts', async () => {
  const f = observationFence(await makeGrant()); let calls = 0;
  const provider = new ControlledGeminiProvider(f, 'mock-only', async () => {}, async () => { calls++; throw new Error('FORBIDDEN'); });
  const results = await Promise.allSettled(Array.from({ length: 16 }, () => provider.translate({ fullText: 'Synthetic', sourceLanguage: 'vi', targetLanguage: 'en', groups: [] })));
  assert.equal(results.filter(r => r.status === 'rejected').length, 16); assert.equal(calls, 0);
});
test('actual JWT/RBAC/ownership routes enforce independent permit scopes A/B without provider or persistence', async t => {
  const { executionApp } = await import('../src/controlled-development/execution-app.js');
  const { User } = await import('../src/models/User.js');
  const { Project } = await import('../src/models/Project.js');
  const { signAccessToken } = await import('../src/utils/jwt.js');
  const { Types } = await import('mongoose');
  const admin = '8'.repeat(24), other = '9'.repeat(24);
  t.mock.method(User, 'findOne', async (f: any) => new User({ _id: f._id, fullName: 'Synthetic', email: 'test@example.invalid', role: f._id === admin ? 'ADMIN' : 'CUSTOMER', status: 'ACTIVE' }));
  t.mock.method(Project, 'findOne', (f: any) => ({ select: async () => f.userId === owner && [a, b].includes(f._id) ? { _id: new Types.ObjectId(f._id) } : null }) as any);
  const admission = { snapshot: () => ({ active: 0, reservedCredits: 0 }), responseScope: async (_id: string, work: () => Promise<unknown>) => work() } as any;
  let plans = 0;
  for (const id of [a, b]) {
    const service = { plan: async (projectId: string, userId: string) => { assert.equal(projectId, id); assert.equal(userId, owner); plans++; return { synthetic: true }; } } as any;
    const server = executionApp(observationFence(await makeGrant(id)), service, admission, ['http://localhost:5173']).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const request = (projectId: string, userId?: string) => fetch(`http://127.0.0.1:${(server.address() as any).port}/api/projects/${projectId}/translations/plan/en`, { headers: userId ? { Authorization: `Bearer ${signAccessToken(userId, userId === admin ? 'ADMIN' : 'CUSTOMER')}` } : {} });
    try {
      assert.equal((await request(id)).status, 401);
      assert.equal((await request(id, admin)).status, 403);
      assert.equal((await request(id, other)).status, 404);
      assert.equal((await request(id, owner)).status, 200);
      assert.equal((await request(id === a ? b : a, owner)).status, 403);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  }
  assert.equal(plans, 2);
});
