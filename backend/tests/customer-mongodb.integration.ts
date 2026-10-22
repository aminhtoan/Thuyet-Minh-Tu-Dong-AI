// Explicit opt-in: isolated MongoDB only, never discovered by *.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import mongoose, { Types } from 'mongoose';
import express from 'express';
import { connectIsolatedMongo, TEST_DATABASE } from './helpers/isolated-mongo.js';
const verified = await connectIsolatedMongo(); await verified.instance.disconnect();
process.env.NODE_ENV = 'test'; process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;
process.env.CUSTOMER_TRANSLATION_ENABLED = 'true'; process.env.GROUP_TRANSLATION_ENABLED = 'false';
process.env.CUSTOMER_TRANSLATION_THINKING = 'MEDIUM'; delete process.env.CONTROLLED_PROVIDER_MODE;
// Test-process-only small caps for concurrency/boundary coverage, NOT defaults.
process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT = '3'; process.env.CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT = '20';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex'); process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d'; process.env.GEMINI_API_KEY = '';
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
await mongoose.connect(process.env.TEST_MONGODB_URI!, { dbName: TEST_DATABASE, autoCreate: false, autoIndex: false });
const { Project } = await import('../src/models/Project.js'); const { Transcript } = await import('../src/models/Transcript.js');
const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js'); const { Translation } = await import('../src/models/Translation.js');
const { TranslationAttempt } = await import('../src/models/TranslationAttempt.js'); const { Language } = await import('../src/models/Language.js');
const { User } = await import('../src/models/User.js'); const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { GroupTranslationService, groupTranslationService } = await import('../src/services/translation/group-translation.service.js');
const { GroupDraftStore } = await import('../src/services/translation/group-draft-store.js');
const { CustomerAttemptStore } = await import('../src/services/translation/customer-attempt.js');
const { withCustomerTranslation } = await import('../src/services/translation/customer-scope.js');
const { digest, revision, candidateGroups } = await import('../src/services/translation/group-plan.js');
const { loadSource } = await import('../src/services/translation/group-translation.service.js');
const { GeminiGroupTranslationProvider } = await import('../src/services/translation/gemini-group-translation.provider.js');
const { customerDispatch, customerResponse } = await import('../src/services/translation/customer-execution.js');
const { projectRouter } = await import('../src/routes/project.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js'); const { signAccessToken } = await import('../src/utils/jwt.js');

test('consolidated real Mongo Customer ledger/quotas/restart/approval races; mock provider ONLY', { timeout: 120000 }, async t => {
  const users: Types.ObjectId[] = [], projects: Types.ObjectId[] = [], transcripts: Types.ObjectId[] = [], segments: Types.ObjectId[] = [], languages: Types.ObjectId[] = [];
  const counterIds = new Set<string>(); const attemptIds = new Set<string>();
  const day = new Date().toISOString().slice(0, 10), globalId = `customer-global-day:${day}`;
  let globalOwned = false, calls = 0;
  const fetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (input: any, init?: RequestInit) => { if (!String(input).startsWith('http://127.0.0.1:')) throw Error('EXTERNAL_HTTP_FORBIDDEN'); return fetch(input, init); });
  const metadata = async () => { await customerDispatch('METADATA'); await customerResponse('METADATA'); };
  const provider = { async translate(input: any, verify?: () => Promise<void>) { await verify?.(); await metadata(); await verify?.(); await customerDispatch('GENERATION'); calls++; await customerResponse('GENERATION'); return input.groups.map((g: any) => ({ groupId: g.groupId, translatedText: 'Synthetic English fixture only.' })); } };
  const service = () => new GroupTranslationService(provider, new GroupDraftStore());
  async function fixture(owner = new Types.ObjectId()) {
    if (!users.some(id => id.equals(owner))) { users.push(owner); await User.create({ _id: owner, fullName: 'Synthetic only', email: `${owner}@integration.invalid`, passwordHash: 'synthetic-not-a-password', role: 'CUSTOMER', status: 'ACTIVE' }); }
    counterIds.add(`customer-day:${owner}:${day}`);
    const project = new Types.ObjectId(), transcript = new Types.ObjectId(), segment = new Types.ObjectId(); projects.push(project); transcripts.push(transcript); segments.push(segment);
    await Project.create({ _id: project, userId: owner, name: 'Synthetic ledger fixture', sourceLanguage: 'vi', status: 'TRANSCRIBED' });
    await Transcript.create({ _id: transcript, projectId: project, revision: 1, status: 'READY', languageCode: 'vi', fullText: 'Synthetic source fixture.' });
    await TranscriptSegment.create({ _id: segment, transcriptId: transcript, sequence: 1, startTime: 0, endTime: 1, text: 'Synthetic source fixture.' });
    const source = await loadSource(String(project));
    const scope = { ownerId: String(owner), projectId: String(project), targetLanguage: 'en', sourceRevision: revision(source) };
    attemptIds.add(digest(['CUSTOMER_TRANSLATION_V1', scope.ownerId, scope.projectId, scope.targetLanguage, scope.sourceRevision]));
    return { owner, project, transcript, segment, source, scope };
  }
  const d = (f: Awaited<ReturnType<typeof fixture>>) => ({ draftId: randomUUID(), ownerId: String(f.owner), projectId: String(f.project), transcriptId: String(f.transcript), transcriptRevision: 1, sourceLanguage: 'vi', targetLanguage: 'en', sourceRevision: f.scope.sourceRevision,
    groupingVersion: 'phrase-candidates-v1', groups: candidateGroups(f.source).map(g => ({ ...g, translatedText: 'Synthetic only.' })), outputDigest: 'a'.repeat(64), state: 'DRAFT' as const, alignmentFormat: 'GROUPS_V1' as const, expiresAt: new Date(Date.now() + 60000).toISOString() });
  try {
    for (const model of [Project, Transcript, TranscriptSegment, Translation, TranslationAttempt, Language, User, ProcessingJob]) await model.createCollection();
    // Do not modify/clean any pre-existing quota/fixture documents.
    if (await TranslationAttempt.collection.findOne({ _id: globalId } as never)) throw Error('TEST_GLOBAL_QUOTA_NOT_DISPOSABLE');
    globalOwned = true; counterIds.add(globalId);
    await Translation.collection.createIndex({ transcriptId: 1, targetLanguage: 1 }, { unique: true });
    if (!await Language.exists({ code: 'en', isActive: true })) { const id = new Types.ObjectId(); languages.push(id); await Language.create({ _id: id, code: 'en', name: 'English fixture', nativeName: 'English', isActive: true }); }
    console.log('ISOLATION_PASS database=' + TEST_DATABASE + '; MongoDB=8.0.17; rs=narration-test-rs; real Gemini=0');
    await t.test('durable majority claim, 16 concurrent ledger instances, restart recover exact saved draft', async () => {
      const f = await fixture(); let invoked = 0;
      const expected = d(f);
      const results = await Promise.allSettled(Array.from({ length: 16 }, () => new CustomerAttemptStore().execute(f.scope, 'binding', async () => { await metadata(); invoked++; await new Promise(r => setTimeout(r, 30)); return expected; })));
      assert.equal(invoked, 1); assert.ok(results.some(r => r.status === 'fulfilled'));
      assert.deepEqual(await new CustomerAttemptStore().execute(f.scope, 'binding', async () => { throw Error('REPLAY'); }), expected);
      const recovered = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'tests/helpers/customer-recovery.worker.ts', JSON.stringify(f.scope)], { encoding: 'utf8', windowsHide: true, timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] }));
      assert.equal(recovered.recovery, 'PASS'); assert.equal(recovered.draftId, expected.draftId); assert.equal(recovered.expiresAt, expected.expiresAt); assert.equal(recovered.providerCalls, 0);
      assert.equal(await Translation.countDocuments({ projectId: f.project }), 0);
      const receipt = await TranslationAttempt.collection.findOne({ _id: digest(['CUSTOMER_TRANSLATION_V1', f.scope.ownerId, f.scope.projectId, 'en', f.scope.sourceRevision]) } as never);
      assert.equal(receipt?.quotaReserved, true); assert.equal(receipt?.quotaDay, day);
      assert.equal((await TranslationAttempt.collection.findOne({ _id: `customer-day:${f.owner}:${day}` } as never) as any).count, 1);
    });
    await t.test('normal authenticated HTTP automatically authorizes, reload/restart draft persistence, no permit', async ctx => {
      const f = await fixture(), svc = service();
      ctx.mock.method(groupTranslationService, 'customerGenerate', svc.customerGenerate.bind(svc));
      const app = express(); app.use(express.json()); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
      const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
      try {
        const url = `http://127.0.0.1:${(server.address() as any).port}/api/projects/${f.project}/translations`;
        const post = (id?: string) => globalThis.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: `Bearer ${signAccessToken(id, 'CUSTOMER')}` } : {}) }, body: JSON.stringify({ targetLanguage: 'en', format: 'GROUPS_V1' }) });
        assert.equal((await post()).status, 401); const other = await fixture(); assert.equal((await post(String(other.owner))).status, 404);
        const before = calls; const response = await post(String(f.owner)); assert.equal(response.status, 200);
        const draft = (await response.json() as any).data.draft; assert.equal(draft.state, 'DRAFT'); assert.equal(calls, before + 1);
        assert.equal((await service().customerDraft(String(f.project), String(f.owner)))?.draftId, draft.draftId);
        assert.equal((await service().customerGenerate(String(f.project), String(f.owner))).draftId, draft.draftId); assert.equal(calls, before + 1);
        const state = await globalThis.fetch(url + '/customer-draft/en', { headers: { Authorization: `Bearer ${signAccessToken(String(f.owner), 'CUSTOMER')}` } });
        assert.equal(state.status, 200); const envelope = (await state.json() as any).data;
        assert.equal(envelope.attempt.status, 'DRAFT_SAVED'); assert.equal(envelope.draft.draftId, draft.draftId); assert.equal(calls, before + 1);
        assert.equal(await Translation.countDocuments({ projectId: f.project }), 0);
      } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
    });
    await t.test('pre-dispatch failure is durable, no repeat after new instance', async () => {
      const f = await fixture(); let invoked = 0;
      const work = async () => { invoked++; throw Error('SYNTHETIC_PROVIDER_TIMEOUT'); };
      await assert.rejects(new CustomerAttemptStore().execute(f.scope, 'binding', work));
      await assert.rejects(new CustomerAttemptStore().execute(f.scope, 'binding', work)); assert.equal(invoked, 1);
      assert.equal((await new CustomerAttemptStore().inspect(f.scope))?.status, 'FAILED_PRE_DISPATCH');
      assert.equal(await TranslationAttempt.collection.findOne({ _id: `customer-day:${f.owner}:${day}` } as never), null);
    });
    await t.test('lost claim acknowledgement commits claim but dispatches zero; saved draft lost response recovers without rebilling', async ctx => {
      const f = await fixture(), original = TranslationAttempt.collection.insertOne.bind(TranslationAttempt.collection); let invoked = 0;
      const mock = ctx.mock.method(TranslationAttempt.collection, 'insertOne', async (...args: any[]) => { const result = await (original as any)(...args); if (args[0].projectId === f.scope.projectId) throw Error('LOST_ACK'); return result; });
      await assert.rejects(new CustomerAttemptStore().execute(f.scope, 'binding', async () => { invoked++; return d(f); })); mock.mock.restore();
      await assert.rejects(new CustomerAttemptStore().execute(f.scope, 'binding', async () => { invoked++; return d(f); })); assert.equal(invoked, 0);
      const saved = await fixture(), expected = d(saved), finish = TranslationAttempt.updateOne.bind(TranslationAttempt);
      const finishMock = ctx.mock.method(TranslationAttempt, 'updateOne', async (...args: any[]) => { const result = await (finish as any)(...args); if (args[1].$set?.state === 'DRAFT') throw Error('LOST_SAVE_ACK'); return result; });
      assert.deepEqual(await new CustomerAttemptStore().execute(saved.scope, 'binding', async () => { invoked++; return expected; }), expected); finishMock.mock.restore();
      assert.deepEqual(await new CustomerAttemptStore().execute(saved.scope, 'binding', async () => { throw Error('REPLAY'); }), expected); assert.equal(invoked, 1);
    });
    await t.test('atomic manual approval rollback and revision race; no stale READY artifact', async ctx => {
      const f = await fixture(), svc = service(), draft = await svc.customerGenerate(String(f.project), String(f.owner));
      const originalCreate = Translation.create.bind(Translation);
      const fail = ctx.mock.method(Translation, 'create', async (...args: any[]) => { await (originalCreate as any)(...args); throw Error('ROLLBACK_AFTER_INSERT'); });
      await assert.rejects(withCustomerTranslation(() => svc.approve(String(f.project), String(f.owner), draft.draftId, { outputDigest: draft.outputDigest, reviewed: true })), /ROLLBACK_AFTER_INSERT/); fail.mock.restore();
      assert.equal(await Translation.countDocuments({ projectId: f.project }), 0); assert.equal((await Project.findById(f.project))!.status, 'TRANSCRIBED');
      const original = Transcript.updateOne.bind(Transcript); let edited = false;
      ctx.mock.method(Transcript, 'updateOne', async (...args: any[]) => {
        if (!edited && String(args[0]._id) === String(f.transcript) && args[1].$set?.revision === 1) {
          edited = true; const session = await mongoose.startSession();
          try { await session.withTransaction(async () => {
            await TranscriptSegment.updateOne({ _id: f.segment }, { $set: { text: 'Synthetic changed source.' } }, { session });
            await Transcript.collection.updateOne({ _id: f.transcript, revision: 1 }, { $set: { fullText: 'Synthetic changed source.' }, $inc: { revision: 1 } }, { session });
          }); } finally { await session.endSession(); }
        }
        return (original as any)(...args);
      });
      await assert.rejects(withCustomerTranslation(() => svc.approve(String(f.project), String(f.owner), draft.draftId, { outputDigest: draft.outputDigest, reviewed: true })));
      assert.equal(await Translation.countDocuments({ projectId: f.project }), 0); assert.equal((await Transcript.findById(f.transcript))!.revision, 2);
      assert.equal(await svc.customerDraft(String(f.project), String(f.owner)), null);
    });
    await t.test('successful approval is atomic and duplicate approval creates one READY record', async () => {
      const f = await fixture(), svc = service(), draft = await svc.customerGenerate(String(f.project), String(f.owner));
      const request = () => withCustomerTranslation(() => svc.approve(String(f.project), String(f.owner), draft.draftId, { outputDigest: draft.outputDigest, reviewed: true }));
      const [a, b] = await Promise.all([request(), request()]); assert.equal(a.translation.id, b.translation.id);
      assert.equal(await Translation.countDocuments({ projectId: f.project, status: 'READY' }), 1); assert.equal((await Project.findById(f.project))!.status, 'TRANSLATED');
    });
    await t.test('durable dispatch stages, timeout ambiguity and invalid response survive restart without replay', async () => {
      for (const completedResponse of [false, true]) {
        const f = await fixture(); let sends = 0;
        await assert.rejects(new CustomerAttemptStore().execute(f.scope, 'binding', async () => {
          await customerDispatch('METADATA'); sends++; await customerResponse('METADATA');
          await customerDispatch('GENERATION'); sends++;
          const during = await new CustomerAttemptStore().inspect(f.scope);
          assert.equal(during?.phase, 'GENERATION_DISPATCHING'); assert.equal(during?.status, 'PROCESSING');
          if (completedResponse) await customerResponse('GENERATION');
          throw new Error('SYNTHETIC_FAILURE');
        }));
        const restarted = new CustomerAttemptStore();
        assert.equal((await restarted.inspect(f.scope))?.status, completedResponse ? 'FAILED_RESPONSE' : 'UNCERTAIN');
        await assert.rejects(restarted.execute(f.scope, 'binding', async () => { sends++; return d(f); })); assert.equal(sends, 2);
        assert.equal(await Translation.countDocuments({ projectId: f.project }), 0);
      }
    });
    await t.test('quota receipt failure rolls back BOTH counters before any mock provider dispatch', async ctx => {
      const f = await fixture(); const before = (await TranslationAttempt.collection.findOne({ _id: globalId } as never) as any).count;
      const attemptId = digest(['CUSTOMER_TRANSLATION_V1', f.scope.ownerId, f.scope.projectId, 'en', f.scope.sourceRevision]);
      const update = TranslationAttempt.collection.updateOne.bind(TranslationAttempt.collection); let dispatched = 0;
      const fail = ctx.mock.method(TranslationAttempt.collection, 'updateOne', async (...args: any[]) => {
        if (args[0]._id === attemptId && args[1].$set?.quotaReserved) throw Error('SYNTHETIC_RECEIPT_FAILURE');
        return (update as any)(...args);
      });
      await assert.rejects(new CustomerAttemptStore().execute(f.scope, 'binding', async () => { await metadata(); dispatched++; return d(f); }), (e: any) => e.code === 'TRANSLATION_QUOTA_UNAVAILABLE');
      fail.mock.restore();
      assert.equal(dispatched, 0);
      assert.equal(await TranslationAttempt.collection.findOne({ _id: `customer-day:${f.owner}:${day}` } as never), null);
      assert.equal((await TranslationAttempt.collection.findOne({ _id: globalId } as never) as any).count, before);
      const attempt = await TranslationAttempt.collection.findOne({ _id: attemptId } as never);
      assert.notEqual(attempt?.quotaReserved, true); assert.equal(attempt?.state, 'FAILED_PRE_DISPATCH');
    });
    await t.test('five distinct concurrent attempts share owner quota atomically; receipts and restart never count twice', async () => {
      const owner = new Types.ObjectId(), fixtures: Awaited<ReturnType<typeof fixture>>[] = [];
      for (let i = 0; i < 5; i++) fixtures.push(await fixture(owner));
      const before = (await TranslationAttempt.collection.findOne({ _id: globalId } as never) as any).count;
      let dispatched = 0;
      const results = await Promise.allSettled(fixtures.map(f => new CustomerAttemptStore().execute(f.scope, 'binding', async () => { await metadata(); dispatched++; return d(f); })));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 3); assert.equal(dispatched, 3);
      assert.equal((await TranslationAttempt.collection.findOne({ _id: `customer-day:${owner}:${day}` } as never) as any).count, 3);
      assert.equal((await TranslationAttempt.collection.findOne({ _id: globalId } as never) as any).count, before + 3);
      const rows = await TranslationAttempt.collection.find({ projectId: { $in: fixtures.map(f => f.scope.projectId) } }).toArray();
      assert.equal(rows.filter(row => row.quotaReserved === true).length, 3);
      for (const [i, f] of fixtures.entries()) {
        const recover = () => new CustomerAttemptStore().execute(f.scope, 'binding', async () => assert.fail('NO_REPLAY'));
        if (results[i]!.status === 'fulfilled') await recover(); else await assert.rejects(recover());
      }
      assert.equal((await TranslationAttempt.collection.findOne({ _id: globalId } as never) as any).count, before + 3);
    });
    await t.test('normal defaults allow more than three independent projects without rearming prior attempts', async () => {
      delete process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT; delete process.env.CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT;
      const owner = new Types.ObjectId();
      try {
        for (let i = 0; i < 4; i++) {
          const f = await fixture(owner);
          const result = await new CustomerAttemptStore().execute(f.scope, 'binding', async () => { await metadata(); return d(f); });
          assert.equal(result.state, 'DRAFT');
          assert.equal((await new CustomerAttemptStore().execute(f.scope, 'binding', async () => assert.fail('NO_REPLAY'))).draftId, result.draftId);
        }
        assert.equal((await TranslationAttempt.collection.findOne({ _id: `customer-day:${owner}:${day}` } as never) as any).count, 4);
      } finally { process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT = '3'; process.env.CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT = '20'; }
    });
    await t.test('explicit test configuration user3/global20 is enforced atomically', async () => {
      const owner = new Types.ObjectId();
      for (let i = 0; i < 4; i++) {
        const f = await fixture(owner), work = async () => { await metadata(); return d(f); };
        if (i < 3) await new CustomerAttemptStore().execute(f.scope, 'binding', work);
        else await assert.rejects(new CustomerAttemptStore().execute(f.scope, 'binding', work), (e: any) => e.code === 'TRANSLATION_DAILY_LIMIT');
      }
      let global = await TranslationAttempt.collection.findOne({ _id: globalId } as never) as any;
      while (global.count < 20) { const f = await fixture(); await new CustomerAttemptStore().execute(f.scope, 'binding', async () => { await metadata(); return d(f); }); global = await TranslationAttempt.collection.findOne({ _id: globalId } as never); }
      const f = await fixture(); let invoked = false;
      await assert.rejects(new CustomerAttemptStore().execute(f.scope, 'binding', async () => { await metadata(); invoked = true; return d(f); }), (e: any) => e.code === 'TRANSLATION_DAILY_LIMIT');
      assert.equal(invoked, false); assert.equal((await TranslationAttempt.collection.findOne({ _id: globalId } as never) as any).count, 20);
      // Owner counter insertion must roll back when the global counter is full.
      assert.equal(await TranslationAttempt.collection.findOne({ _id: `customer-day:${f.owner}:${day}` } as never), null);
    });
    await t.test('installed SDK serializes MEDIUM, maxOutputTokens 8192, one metadata + one generation only', async ctx => {
      process.env.GEMINI_API_KEY = 'synthetic-sdk-key'; process.env.GEMINI_TRANSLATION_MODEL = 'gemini-3.8-flash';
      let metadata = 0, generation = 0;
      ctx.mock.method(globalThis, 'fetch', async (_url: any, init?: RequestInit) => {
        if (init?.method !== 'POST') { metadata++; return Response.json({ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }); }
        generation++; const body = JSON.parse(String(init.body)); assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'MEDIUM'); assert.equal(body.generationConfig.maxOutputTokens, 8192);
        const input = JSON.parse(body.contents[0].parts[0].text);
        return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ outcome: 'translated', groups: input.groups.map((g: any) => ({ groupId: g.groupId, translatedText: 'Synthetic.' })) }) }] } }] });
      });
      const input = { fullText: 'Synthetic.', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: '1'.repeat(64), sourceText: 'Synthetic.' }] };
      try { await withCustomerTranslation(() => new GeminiGroupTranslationProvider().translate(input)); assert.equal(metadata, 1); assert.equal(generation, 1); } finally { process.env.GEMINI_API_KEY = ''; }
    });
    await t.test('S26.6 SIMPLE real SDK mock + isolated Mongo + JWT HTTP multi-group draft/review/approve and failure fences', async ctx => {
      const oldMethod = process.env.CUSTOMER_TRANSLATION_METHOD, oldThinking = process.env.CUSTOMER_TRANSLATION_THINKING;
      const oldGlobal = process.env.CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT, oldUser = process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT;
      Object.assign(process.env, { CUSTOMER_TRANSLATION_METHOD: 'GEMINI_SIMPLE_V1', CUSTOMER_TRANSLATION_THINKING: 'DEFAULT', CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT: '100', CUSTOMER_TRANSLATION_DAILY_USER_LIMIT: '20', GEMINI_API_KEY: 'synthetic-sdk-key' });
      let scenario = 'success', posts = 0, metadataCalls = 0;
      const localFetch = globalThis.fetch;
      ctx.mock.method(globalThis, 'fetch', async (url: any, init?: RequestInit) => {
        const address = String(url);
        if (address.startsWith('http://127.0.0.1:')) return localFetch(url, init);
        assert.ok(address.startsWith('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash'));
        if (init?.method !== 'POST') { metadataCalls++; return Response.json({ supportedGenerationMethods: ['generateContent'] }); }
        posts++;
        const body = JSON.parse(String(init.body));
        assert.deepEqual(body.generationConfig, { candidateCount: 1, maxOutputTokens: 8192 });
        const input = JSON.parse(body.contents[0].parts[0].text);
        assert.equal(input.groups.length, 3);
        if (scenario === 'timeout') throw new DOMException('SYNTHETIC', 'TimeoutError');
        if (scenario === '503') return Response.json({ error: { code: 503, status: 'UNAVAILABLE' } }, { status: 503 });
        const groups = input.groups.map((g: any) => ({ groupId: g.groupId, translatedText: 'Synthetic English fixture.' }));
        if (scenario === 'missing') groups.pop();
        const text = scenario === 'invalid' ? 'not JSON' : JSON.stringify({ outcome: 'translated', groups });
        return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] });
      });
      const svc = new GroupTranslationService(new GeminiGroupTranslationProvider(), new GroupDraftStore());
      ctx.mock.method(groupTranslationService, 'customerGenerate', svc.customerGenerate.bind(svc));
      ctx.mock.method(groupTranslationService, 'customerState', svc.customerState.bind(svc));
      ctx.mock.method(groupTranslationService, 'approve', svc.approve.bind(svc));
      const app = express(); app.use(express.json()); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
      const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
      try {
        for (scenario of ['success', 'missing', 'invalid', 'timeout', '503']) {
          const f = await fixture();
          const extra = [new Types.ObjectId(), new Types.ObjectId()]; segments.push(...extra);
          await TranscriptSegment.insertMany(extra.map((id, i) => ({ _id: id, transcriptId: f.transcript, sequence: i + 2, startTime: i + 1, endTime: i + 2, text: 'Another synthetic phrase.' })));
          await Transcript.updateOne({ _id: f.transcript }, { $set: { fullText: 'Synthetic source fixture. Another synthetic phrase. Another synthetic phrase.' } });
          const source = await loadSource(String(f.project));
          const scope = { ...f.scope, sourceRevision: revision(source) };
          attemptIds.add(digest(['CUSTOMER_TRANSLATION_V1', scope.ownerId, scope.projectId, 'en', scope.sourceRevision]));
          const url = `http://127.0.0.1:${(server.address() as any).port}/api/projects/${f.project}/translations`;
          const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${signAccessToken(String(f.owner), 'CUSTOMER')}` };
          const generate = () => globalThis.fetch(url, { method: 'POST', headers, body: JSON.stringify({ targetLanguage: 'en', format: 'GROUPS_V1' }) });
          const before = posts, response = await generate();
          assert.equal(posts, before + 1);
          const stateResponse = await globalThis.fetch(url + '/customer-draft/en', { headers });
          assert.equal(stateResponse.status, 200);
          const state = (await stateResponse.json() as any).data;
          if (scenario === 'success') {
            assert.equal(response.status, 200); const draft = (await response.json() as any).data.draft;
            assert.equal(state.attempt.status, 'DRAFT_SAVED'); assert.equal(state.draft.draftId, draft.draftId);
            assert.equal(draft.groups.length, 3); assert.equal(draft.sourceRevision, revision(source));
            assert.deepEqual(draft.groups.map((g: any) => g.sourceSegmentIds).flat(), source.segments.map(g => g.id));
            assert.deepEqual(draft.groups.map((g: any) => [g.startTime, g.endTime]), [[0, 1], [1, 2], [2, 3]]);
            assert.equal(await Translation.countDocuments({ projectId: f.project }), 0);
            assert.equal((await generate()).status, 200); assert.equal(posts, before + 1);
            const approveUrl = url + `/drafts/${draft.draftId}/approve`;
            const approve = (reviewed: boolean) => globalThis.fetch(approveUrl, { method: 'POST', headers, body: JSON.stringify({ reviewed, outputDigest: draft.outputDigest }) });
            assert.notEqual((await approve(false)).status, 200);
            assert.equal(await Translation.countDocuments({ projectId: f.project }), 0);
            assert.equal((await approve(true)).status, 200);
            assert.equal(await Translation.countDocuments({ projectId: f.project, status: 'READY' }), 1);
            assert.equal((await Project.findById(f.project))!.status, 'TRANSLATED');
          } else {
            assert.equal(response.status, 502); assert.equal(state.draft, null);
            assert.equal(state.attempt.status, ['timeout', '503'].includes(scenario) ? 'UNCERTAIN' : 'FAILED_RESPONSE');
            assert.equal((await generate()).status, 409); assert.equal(posts, before + 1);
            assert.equal(await Translation.countDocuments({ projectId: f.project }), 0);
            const row = await TranslationAttempt.findOne({ projectId: String(f.project) }).lean(); assert.equal(row?.draftJson, undefined);
          }
          const reread = await loadSource(String(f.project)); assert.equal(revision(reread), revision(source));
          assert.equal(await TranslationAttempt.collection.countDocuments({ _id: `customer-day:${f.owner}:${day}`, count: 1 } as never), 1);
        }
        assert.equal(posts, 5); assert.equal(metadataCalls, 5);
      } finally {
        server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
        for (const [name, value] of Object.entries({ CUSTOMER_TRANSLATION_METHOD: oldMethod, CUSTOMER_TRANSLATION_THINKING: oldThinking, CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT: oldGlobal, CUSTOMER_TRANSLATION_DAILY_USER_LIMIT: oldUser })) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
        process.env.GEMINI_API_KEY = '';
      }
    });
  } finally {
    try {
      for (const model of [Translation, ProcessingJob]) { const rows = await model.find({ projectId: { $in: projects } }).select('_id'); for (const row of rows) await model.collection.deleteOne({ _id: row._id }); }
      const attemptRows = await TranslationAttempt.find({ projectId: { $in: projects.map(String) } }).select('_id'); for (const row of attemptRows) attemptIds.add(String(row._id));
      for (const id of attemptIds) await TranslationAttempt.collection.deleteOne({ _id: id } as never);
      for (const id of counterIds) if (id !== globalId || globalOwned) await TranslationAttempt.collection.deleteOne({ _id: id } as never);
      for (const [model, ids] of [[TranscriptSegment, segments], [Transcript, transcripts], [Project, projects], [User, users], [Language, languages]] as const) for (const id of ids) await model.collection.deleteOne({ _id: id });
      assert.equal(await TranslationAttempt.countDocuments({ _id: { $in: [...attemptIds, ...counterIds] } }), 0);
      assert.equal(await Project.countDocuments({ _id: { $in: projects } }), 0);
      console.log('CUSTOMER_INTEGRATION_FIXTURE_CLEANUP_PASS; development/production writes=0; real Gemini=0');
    } finally { await mongoose.disconnect(); }
  }
});
