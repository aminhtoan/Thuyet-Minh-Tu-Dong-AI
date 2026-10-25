import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import mongoose, { Types } from 'mongoose';
process.env.NODE_ENV = 'test'; process.env.CUSTOMER_TRANSLATION_ENABLED = 'true'; process.env.GROUP_TRANSLATION_ENABLED = 'false';
delete process.env.CONTROLLED_PROVIDER_MODE;
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/mock-only';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex'); process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d'; process.env.GEMINI_API_KEY = '';
const { GroupTranslationService, groupTranslationService } = await import('../src/services/translation/group-translation.service.js');
const { GroupDraftStore } = await import('../src/services/translation/group-draft-store.js');
const { customerAttempts, CustomerAttemptStore } = await import('../src/services/translation/customer-attempt.js');
const { Project } = await import('../src/models/Project.js'); const { User } = await import('../src/models/User.js');
const { Transcript } = await import('../src/models/Transcript.js'); const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js');
const { Translation } = await import('../src/models/Translation.js'); const { Language } = await import('../src/models/Language.js'); const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { projectRouter } = await import('../src/routes/project.routes.js'); const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const { GeminiGroupTranslationProvider } = await import('../src/services/translation/gemini-group-translation.provider.js');
const { TranslationProviderFailure } = await import('../src/services/translation/provider-failure.js');
const owner = '1'.repeat(24), other = '2'.repeat(24), admin = '3'.repeat(24), project = '4'.repeat(24), transcript = '5'.repeat(24);
const query = (value: unknown): any => ({ select() { return this; }, session() { return this; }, then(resolve: any, reject: any) { return Promise.resolve(value).then(resolve, reject); } });
test('normal service authorizes dynamically, derives plan, durable replay/restart, stale/running job/disabled reject without provider', async t => {
  let sourceRevision = 1, running = false, english = false, calls = 0, headerText = 'Synthetic source only.';
  t.mock.method(mongoose, 'connect', () => { throw Error('DATABASE_FORBIDDEN'); });
  t.mock.method(Project, 'findOne', (f: any) => query(f.userId === owner && [project, other].includes(f._id) ? { _id: f._id, sourceLanguage: 'vi', status: 'TRANSCRIBED' } : null));
  t.mock.method(Transcript, 'aggregate', () => ({ session: () => Promise.resolve([{ _id: new Types.ObjectId(transcript), revision: sourceRevision, status: 'READY', languageCode: 'vi', fullText: headerText }]) }));
  t.mock.method(Transcript, 'findOne', () => query({ revision: sourceRevision }));
  t.mock.method(TranscriptSegment, 'aggregate', () => ({ session: () => ({ cursor: () => ({ async *[Symbol.asyncIterator]() { yield { _id: new Types.ObjectId('6'.repeat(24)), sequence: 1, text: 'Synthetic source only.', startTime: 0, endTime: 1 }; }, async close() {} }) }) }));
  t.mock.method(Language, 'exists', (f: any) => query(f.code === 'en' ? {} : null));
  t.mock.method(Translation, 'exists', () => query(english ? {} : null));
  t.mock.method(ProcessingJob, 'exists', () => query(running ? {} : null));
  const rows = new Map<string, any>();
  const repo = { read: async (s: any) => rows.get(JSON.stringify(s)) ?? null,
    claim: async (s: any, binding: string) => { const k = JSON.stringify(s); if (rows.has(k)) throw { code: 11000 }; rows.set(k, { ...s, binding, state: 'CLAIMED' }); }, quota: async () => {},
    record: async () => {}, fail: async () => {},
    finish: async (s: any, _binding: string, draftJson: string) => Object.assign(rows.get(JSON.stringify(s)), { state: 'DRAFT', draftJson }) } as any;
  const ledger = new CustomerAttemptStore(repo);
  t.mock.method(customerAttempts, 'execute', ledger.execute.bind(ledger)); t.mock.method(customerAttempts, 'read', ledger.read.bind(ledger));
  t.mock.method(customerAttempts, 'inspect', ledger.inspect.bind(ledger));
  const provider = { translate: async (input: any, verify?: () => Promise<void>) => { await verify?.(); calls++; return input.groups.map((g: any) => ({ groupId: g.groupId, translatedText: 'Synthetic translated text.' })); } };
  const service = new GroupTranslationService(provider, new GroupDraftStore());
  await assert.rejects(service.customerGenerate(project, admin)); assert.equal(calls, 0);
  running = true; await assert.rejects(service.customerGenerate(project, owner)); running = false; assert.equal(calls, 0);
  headerText = 'x'.repeat(98305); await assert.rejects(service.customerGenerate(project, owner)); headerText = 'Synthetic source only.'; assert.equal(calls, 0);
  const first = await service.customerGenerate(project, owner); assert.equal(first.state, 'DRAFT'); assert.equal(calls, 1);
  const restarted = new GroupTranslationService(provider, new GroupDraftStore());
  assert.equal((await restarted.customerGenerate(project, owner)).draftId, first.draftId); assert.equal(calls, 1);
  assert.equal((await restarted.customerDraft(project, owner))?.draftId, first.draftId);
  const otherDraft = await restarted.customerGenerate(other, owner); assert.notEqual(otherDraft.draftId, first.draftId); assert.equal(calls, 2);
  english = true; await assert.rejects(restarted.customerGenerate(project, owner)); english = false;
  sourceRevision = 2; assert.equal(await restarted.customerDraft(project, owner), null);
  process.env.CUSTOMER_TRANSLATION_ENABLED = 'false'; await assert.rejects(restarted.customerGenerate(project, owner)); process.env.CUSTOMER_TRANSLATION_ENABLED = 'true';
  assert.equal(process.env.GROUP_TRANSLATION_ENABLED, 'false');
  await t.test('simple method preserves saved source/timestamps and durable draft; method switch cannot replay', async () => {
    sourceRevision++; process.env.CUSTOMER_TRANSLATION_METHOD = 'GEMINI_SIMPLE_V1';
    try {
      const value = await service.customerGenerate(project, owner);
      assert.equal(value.state, 'DRAFT'); assert.equal(value.transcriptRevision, sourceRevision);
      assert.equal(value.groups[0]?.startTime, 0); assert.equal(value.groups[0]?.endTime, 1);
      assert.deepEqual(value.groups[0]?.sourceSegmentIds, ['6'.repeat(24)]);
      const before = calls;
      assert.equal((await service.customerGenerate(project, owner)).draftId, value.draftId);
      process.env.CUSTOMER_TRANSLATION_METHOD = 'GROUPS_V1';
      await assert.rejects(service.customerGenerate(project, owner)); assert.equal(calls, before);
    } finally { delete process.env.CUSTOMER_TRANSLATION_METHOD; }
  });
  for (const status of [400, 402, 500, 503, 504]) await t.test(`SDK HTTP ${status} evidence survives service and durable failure mapping`, async ctx => {
    sourceRevision++; process.env.GEMINI_API_KEY = 'synthetic-only';
    let metadata = 0, generation = 0; const logs: unknown[] = [];
    ctx.mock.method(console, 'error', (...args) => logs.push(args));
    ctx.mock.method(globalThis, 'fetch', async (_url, init) => {
      if (init?.method !== 'POST') { metadata++; return Response.json({ supportedGenerationMethods: ['generateContent'] }); }
      generation++; return Response.json({ error: { code: status, message: 'PRIVATE_KEY_AND_TRANSCRIPT', status: 'INVALID_ARGUMENT', details: [{ '@type': 'type.googleapis.com/google.rpc.BadRequest', fieldViolations: [{ field: 'generation_config.thinking_config.thinking_level', description: 'PRIVATE_DESCRIPTION' }] }] } }, { status });
    });
    repo.fail = async (s: any, _b: string, state: string, phase: string, diagnosticCode: string, providerHttpStatus: number | null, providerDiagnostic: unknown, transportDiagnostic: unknown) => {
      Object.assign(rows.get(JSON.stringify(s)), { state, phase, diagnosticCode, providerHttpStatus, providerDiagnostic, transportDiagnostic }); return true;
    };
    const failing = new GroupTranslationService(new GeminiGroupTranslationProvider(), new GroupDraftStore());
    await assert.rejects(failing.customerGenerate(project, owner), (e: any) => e instanceof TranslationProviderFailure && e.providerHttpStatus === status && e.statusCode === 502 && e.code === (status === 504 ? 'TRANSLATION_TIMEOUT' : 'TRANSLATION_PROVIDER_ERROR') && !e.message.includes('PRIVATE'));
    const row = [...rows.values()].reverse().find(r => r.providerHttpStatus === status);
    assert.equal(row.state, 'UNCERTAIN'); assert.equal(row.phase, 'GENERATION_DISPATCHING'); assert.equal(row.draftJson, undefined);
    assert.equal(row.transportDiagnostic.origin, 'HTTP_RESPONSE'); assert.equal(row.transportDiagnostic.operation, 'GENERATION');
    assert.deepEqual(row.providerDiagnostic, status === 400 ? { status: 'INVALID_ARGUMENT', reasons: [], parameters: ['generationConfig.thinkingConfig.thinkingLevel'] } : undefined);
    assert.doesNotMatch(JSON.stringify(row), /PRIVATE/);
    const state = await failing.customerState(project, owner);
    assert.equal(state.attempt?.providerHttpStatus, [400, 503, 504].includes(status) ? status : null);
    await assert.rejects(failing.customerGenerate(project, owner));
    process.env.CUSTOMER_TRANSLATION_MODEL_SELECTION = 'FALLBACK';
    try { await assert.rejects(failing.customerGenerate(project, owner)); }
    finally { delete process.env.CUSTOMER_TRANSLATION_MODEL_SELECTION; }
    assert.equal(metadata, 1); assert.equal(generation, 1);
    assert.doesNotMatch(JSON.stringify(logs), /PRIVATE/); assert.match(JSON.stringify(logs), new RegExp(`"providerHttpStatus":${status}`));
    process.env.GEMINI_API_KEY = '';
  });
});
test('normal POST keeps JWT/CUSTOMER/ownership and strict payload; no permit or legacy fallback', async t => {
  let calls = 0;
  t.mock.method(User, 'findOne', async (f: any) => new User({ _id: f._id, fullName: 'Synthetic', email: 'test@example.invalid', role: f._id === admin ? 'ADMIN' : 'CUSTOMER', status: 'ACTIVE' }));
  t.mock.method(Project, 'findOne', (f: any) => query(f.userId === owner && f._id === project ? { _id: new Types.ObjectId(project) } : null));
  t.mock.method(groupTranslationService, 'customerGenerate', async (id, user) => { assert.equal(id, project); assert.equal(user, owner); calls++; return { state: 'DRAFT' } as any; });
  const app = express(); app.use(express.json()); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/projects/${project}/translations`;
  const post = (user?: string, body = { targetLanguage: 'en' } as any) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${signAccessToken(user, user === admin ? 'ADMIN' : 'CUSTOMER')}` } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await post()).status, 401);
    // The router permits ADMIN generally, but this fixture owns no matching
    // project for it. Ownership must hide that project before dispatch (404).
    const denied = await post(admin); assert.equal(denied.status, 404);
    assert.equal((await denied.json()).error.code, 'PROJECT_NOT_FOUND'); assert.equal(calls, 0);
    assert.equal((await post(other)).status, 404);
    assert.equal((await post(owner, { targetLanguage: 'en', sourceDigest: 'forged', permit: 'forged' })).status, 400);
    assert.equal((await post(owner, { targetLanguage: 'fr' })).status, 400);
    assert.equal((await post(owner)).status, 200); assert.equal((await post(owner, { targetLanguage: 'en', format: 'GROUPS_V1' })).status, 200); assert.equal(calls, 2);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
