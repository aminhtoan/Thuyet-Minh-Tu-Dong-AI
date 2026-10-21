import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';
import { grant, owner, input } from './controlled-execution/fixtures.js';
process.env.NODE_ENV = 'development'; process.env.CONTROLLED_PROVIDER_MODE = 'PERMIT';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/no-connection-mocked-only';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex'); process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d';
process.env.GEMINI_API_KEY = ''; process.env.OPENAI_API_KEY = ''; process.env.GROUP_TRANSLATION_ENABLED = 'false';
const { webExecutionReadiness } = await import('../src/controlled-development/web-execution.js');
const { executionApp } = await import('../src/controlled-development/execution-app.js');
const { User } = await import('../src/models/User.js');
const { Project } = await import('../src/models/Project.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const p = { ...grant(), thinking: 'MEDIUM', deploymentId: 'a'.repeat(64) };
const source = { revision: 1, digest: p.sourceDigest, segmentCount: 1, groupCount: 1, coverage: 1 };
const admission = { operation: async (_id: string, work: () => unknown) => work(), responseScope: async (_id: string, work: () => unknown) => work(), snapshot: () => ({ active: 0, reservedCredits: 0 }) } as any;
const fence = (patch = {}, state = 'UNUSED') => ({ permit: { ...p, ...patch }, readStatus: async () => state, assertUsable: () => {} }) as any;
test('readiness is read-only, default locked, expiry/consumption/missing/deployment/mode/source mismatches fail closed', async () => {
  assert.equal((await webExecutionReadiness(fence(), admission, false)).state, 'LOCKED');
  assert.equal((await webExecutionReadiness(fence({ expiresAt: 1 }), admission, true)).state, 'EXPIRED');
  assert.equal((await webExecutionReadiness(fence({}, 'REQUEST_CONSUMED'), admission, true)).state, 'CONSUMED');
  for (const f of [fence({}, 'BLOCKED'), fence({ deploymentId: undefined }), fence({ thinking: 'LOW' }), fence({ model: 'other' })]) assert.equal((await webExecutionReadiness(f, admission, true, async () => source)).state, 'MISMATCHED');
  for (const changed of [{ ...source, revision: 2 }, { ...source, digest: 'f'.repeat(64) }, { ...source, coverage: 0 }]) assert.equal((await webExecutionReadiness(fence(), admission, true, async () => changed)).state, 'MISMATCHED');
  assert.equal((await webExecutionReadiness(fence(), admission, true, async () => { throw Error('deployment/input/plan mismatch'); })).state, 'MISMATCHED');
  const result = await webExecutionReadiness(fence(), admission, true, async () => source);
  assert.equal(result.state, 'READY');
  for (const secret of ['ownerId', 'deploymentId', 'inputDigest', 'planDigest', 'apiKey', 'issuedAt', 'pricingVerifiedOn']) assert.ok(!JSON.stringify(result).includes(secret));
});
test('protected Web readiness/POST keeps JWT/RBAC/ownership, confirmation, single submission, no automatic approval or provider', async t => {
  const admin = 'e'.repeat(24), other = 'f'.repeat(24), origin = 'http://localhost:5173';
  t.mock.method(User, 'findOne', async (f: any) => new User({ _id: f._id, fullName: 'Synthetic', email: 'synthetic@example.invalid', role: f._id === admin ? 'ADMIN' : 'CUSTOMER', status: 'ACTIVE' }));
  t.mock.method(Project, 'findOne', (f: any) => ({ select: async () => f.userId === owner && f._id === p.projectId ? { _id: p.projectId } : null }) as any);
  let previews = 0, plans = 0;
  const service = { plan: async () => { plans++; return { sourceRevision: p.sourceDigest, transcriptRevision: 1, groupingVersion: 'phrase-candidates-v1', groups: [{ groupId: input.groups[0]!.groupId, sourceSegmentIds: ['1'.repeat(24)] }] }; },
    preview: async (_id: string, user: string, body: any) => { previews++; assert.equal(user, owner); assert.equal(body.idempotencyKey, p.id); return { synthetic: 'validated draft stand-in' }; } } as any;
  const verify = async () => source;
  for (const enabled of [false, true]) {
    const server = executionApp(fence(), service, admission, [origin], { enabled, verify }).listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as any).port}/api/projects/${p.projectId}/translations`;
    const request = (suffix: string, token?: string, body?: unknown, requestOrigin = origin) => fetch(base + suffix, { method: body ? 'POST' : 'GET', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Origin: requestOrigin, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const token = signAccessToken(owner, 'CUSTOMER');
    try {
      assert.equal((await request('/execution-readiness')).status, 401);
      const expired = jwt.sign({ role: 'CUSTOMER' }, process.env.JWT_ACCESS_SECRET!, { subject: owner, expiresIn: -1 });
      assert.equal((await request('/execution-readiness', expired)).status, 401);
      assert.equal((await request('/execution-readiness', signAccessToken(admin, 'ADMIN'))).status, 403);
      assert.equal((await request('/execution-readiness', signAccessToken(other, 'CUSTOMER'))).status, 404);
      assert.equal((await fetch(base.replace(p.projectId, other) + '/execution-readiness', { headers: { Authorization: `Bearer ${token}` } })).status, 404);
      const ready = (await (await request('/execution-readiness', token)).json()).data;
      assert.equal(ready.state, enabled ? 'READY' : 'LOCKED'); assert.equal(previews, 0);
      const body = { confirmation: 'EXECUTE_ONCE', authorizationId: ready.authorizationId ?? 'a'.repeat(64) };
      assert.equal((await request('/controlled-preview', undefined, body)).status, 401);
      assert.equal((await request('/controlled-preview', expired, body)).status, 401);
      assert.equal((await request('/controlled-preview', signAccessToken(admin, 'ADMIN'), body)).status, 403);
      assert.equal((await request('/controlled-preview', signAccessToken(other, 'CUSTOMER'), body)).status, 404);
      assert.equal((await request('/controlled-preview', token, body, 'http://attacker.invalid')).status, 403);
      assert.equal((await request('/controlled-preview', token, { ...body, confirmation: 'NO' })).status, 403);
      assert.equal((await request('/controlled-preview', token, { ...body, authorizationId: '0'.repeat(64) })).status, 409);
      const responses = await Promise.all(Array.from({ length: 16 }, () => request('/controlled-preview', token, body)));
      assert.equal(responses.filter(r => r.status === 200).length, enabled ? 1 : 0);
      assert.equal(responses.filter(r => r.status === 409).length, enabled ? 15 : 16);
      if (enabled) assert.equal((await (await request('/execution-readiness', token)).json()).data.state, 'CONSUMED');
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  }
  assert.equal(plans, 1); assert.equal(previews, 1); assert.equal(process.env.GROUP_TRANSLATION_ENABLED, 'false');
});

test('plan drift or preview failure permanently latches the Web attempt; subsequent POST never repeats work', async t => {
  t.mock.method(User, 'findOne', async () => new User({ _id: owner, fullName: 'Synthetic', email: 'synthetic@example.invalid', role: 'CUSTOMER', status: 'ACTIVE' }));
  t.mock.method(Project, 'findOne', () => ({ select: async () => ({ _id: p.projectId }) }) as any);
  for (const phase of ['plan-drift', 'preview-failure']) {
    let plans = 0, previews = 0;
    const service = { plan: async () => { plans++; return { sourceRevision: phase === 'plan-drift' ? '0'.repeat(64) : p.sourceDigest, transcriptRevision: 1, groups: [{ groupId: input.groups[0]!.groupId, sourceSegmentIds: ['1'.repeat(24)] }], groupingVersion: 'phrase-candidates-v1' }; },
      preview: async () => { previews++; throw Error('synthetic failure, no provider'); } } as any;
    const origin = 'http://localhost:5173';
    const server = executionApp(fence(), service, admission, [origin], { enabled: true, verify: async () => source }).listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as any).port}/api/projects/${p.projectId}/translations`;
    const headers = { Authorization: `Bearer ${signAccessToken(owner, 'CUSTOMER')}`, Origin: origin, 'Content-Type': 'application/json' };
    try {
      const ready = (await (await fetch(base + '/execution-readiness', { headers })).json()).data;
      const post = () => fetch(base + '/controlled-preview', { method: 'POST', headers, body: JSON.stringify({ confirmation: 'EXECUTE_ONCE', authorizationId: ready.authorizationId }) });
      assert.equal((await post()).status, phase === 'plan-drift' ? 409 : 503);
      assert.equal((await post()).status, 409);
      assert.equal((await (await fetch(base + '/execution-readiness', { headers })).json()).data.state, 'CONSUMED');
      assert.equal(plans, 1); assert.equal(previews, phase === 'plan-drift' ? 0 : 1);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  }
});
