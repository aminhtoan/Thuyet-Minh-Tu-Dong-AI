// Explicit opt-in executable. Never included in ordinary *.test.ts discovery.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import mongoose, { Types } from 'mongoose';
import express from 'express';
import { getHeapStatistics } from 'node:v8';
import { connectIsolatedMongo, TEST_DATABASE } from './helpers/isolated-mongo.js';

// No application imports before verified deployment identity and explicit config.
const verified = await connectIsolatedMongo();
await verified.instance.disconnect();
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI!;
process.env.GROUP_TRANSLATION_ENABLED = 'true'; // isolated test process only
process.env.GEMINI_API_KEY = ''; process.env.OPENAI_API_KEY = '';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '7d';
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
await mongoose.connect(process.env.TEST_MONGODB_URI!, { dbName: TEST_DATABASE, autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000 });
assert.equal(mongoose.connection.db!.databaseName, TEST_DATABASE);
const { Project } = await import('../src/models/Project.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js');
const { Translation } = await import('../src/models/Translation.js');
const { Language } = await import('../src/models/Language.js');
const { User } = await import('../src/models/User.js');
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const { GroupTranslationService, loadSource } = await import('../src/services/translation/group-translation.service.js');
const { GroupDraftStore } = await import('../src/services/translation/group-draft-store.js');
const { GroupAdmission } = await import('../src/services/translation/group-admission.js');
const { revision } = await import('../src/services/translation/group-plan.js');
const { boundedTextProjection } = await import('../src/services/translation/bounded-source.js');
const { updateTranscriptSegment } = await import('../src/services/transcription.service.js');
const { generate: generateNarration } = await import('../src/services/narration.service.js');
const { getTranslation } = await import('../src/services/translation-processing.service.js');
const { projectRouter, createProjectRouter } = await import('../src/routes/project.routes.js');
const { groupProfileControllers } = await import('../src/controllers/translation.controller.js');
const { GeminiGroupTranslationProvider } = await import('../src/services/translation/gemini-group-translation.provider.js');
const { createApp } = await import('../src/app.js');
const { createApiRouter } = await import('../src/routes/index.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { signAccessToken } = await import('../src/utils/jwt.js');

test('real isolated MongoDB GROUPS_V1 source, transactions, races and authorization', { timeout: 180000 }, async t => {
  const ids = { projects: [] as Types.ObjectId[], transcripts: [] as Types.ObjectId[], segments: [] as Types.ObjectId[], users: [] as Types.ObjectId[], languages: [] as Types.ObjectId[] };
  const run = randomUUID(); let providerCalls = 0;
  // Block all non-fixture HTTP even if an application default provider is accidentally used.
  const realFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (input: any, init?: RequestInit) => {
    if (!String(input).startsWith('http://127.0.0.1:')) throw new Error('EXTERNAL_HTTP_FORBIDDEN');
    return realFetch(input, init);
  });
  const pendingLogs: Promise<unknown>[] = [];
  const realLogCreate = ActivityLog.create.bind(ActivityLog);
  t.mock.method(ActivityLog, 'create', (...args: any[]) => { const promise = (realLogCreate as any)(...args); pendingLogs.push(Promise.resolve(promise)); return promise; });
  const errorCode = (code: string) => (error: any) => error?.code === code;
  const provider = { async translate(input: any) { providerCalls++; return input.groups.map((g: any, i: number) => ({ groupId: g.groupId, translatedText: `Synthetic English group ${i + 1}.` })); } };
  const newService = () => new GroupTranslationService(provider, new GroupDraftStore());
  const owner = new Types.ObjectId(), other = new Types.ObjectId(); ids.users.push(owner, other);
  async function fixture(count = 30, fixtureOwner = owner) {
    const projectId = new Types.ObjectId(), transcriptId = new Types.ObjectId(); ids.projects.push(projectId); ids.transcripts.push(transcriptId);
    const segments = Array.from({ length: count }, (_, i) => ({ _id: new Types.ObjectId(), transcriptId, sequence: i + 1,
      startTime: i / 4, endTime: (i + 1) / 4, text: `từ${i % 10}${(i + 1) % 14 === 0 ? '.' : ''}` }));
    ids.segments.push(...segments.map(s => s._id));
    await Project.create({ _id: projectId, userId: fixtureOwner, name: `Synthetic ${run}`, sourceLanguage: 'vi', status: 'TRANSCRIBED' });
    await Transcript.create({ _id: transcriptId, projectId, languageCode: 'vi', fullText: segments.map(s => s.text).join(' '), status: 'READY', revision: 1 });
    await TranscriptSegment.insertMany(segments);
    return { projectId: String(projectId), transcriptId, segments };
  }
  async function draft(f: Awaited<ReturnType<typeof fixture>>, service = newService()) {
    const plan = await service.plan(f.projectId, String(owner), 'en');
    const body = { targetLanguage: 'en', sourceRevision: plan.sourceRevision, groupingVersion: plan.groupingVersion, groups: plan.groups.map(g => g.sourceSegmentIds), idempotencyKey: randomUUID() };
    return { service, plan, body, draft: await service.preview(f.projectId, String(owner), body) };
  }
  const approval = (d: { outputDigest: string }) => ({ outputDigest: d.outputDigest, reviewed: true as const });
  try {
    for (const model of [Project, Transcript, TranscriptSegment, Translation, Language, User, ProcessingJob, ActivityLog]) await model.createCollection();
    // Required application uniqueness, only in this verified isolated DB; no sync/dropIndexes.
    await Translation.collection.createIndex({ transcriptId: 1, targetLanguage: 1 }, { unique: true });
    await TranscriptSegment.collection.createIndex({ transcriptId: 1, sequence: 1 }, { unique: true });
    for (const id of [owner, other]) await User.create({ _id: id, fullName: 'Synthetic fixture', email: `${id}@integration.invalid`, passwordHash: 'synthetic-not-a-password', role: 'CUSTOMER', status: 'ACTIVE' });
    const language = await Language.findOne({ code: 'en' });
    if (language) assert.equal(language.isActive, true);
    else { const id = new Types.ObjectId(); ids.languages.push(id); await Language.create({ _id: id, code: 'en', name: 'Synthetic English', nativeName: 'English', isActive: true }); }

    await t.test('application composition preserves default runtime and refuses non-test router overrides', () => {
      const override = createProjectRouter();
      const routes = createApiRouter(override);
      const previous = process.env.NODE_ENV;
      for (const mode of ['development', 'production']) {
        process.env.NODE_ENV = mode;
        try {
          assert.throws(() => createApiRouter(override), /TEST_ROUTER_INJECTION_REQUIRES_TEST_ENV/);
          assert.throws(() => createApp(routes), /TEST_ROUTER_INJECTION_REQUIRES_TEST_ENV/);
          assert.doesNotThrow(() => createApp());
          assert.throws(() => new GroupAdmission({ sourceBytes: 128 * 1024, requestCredits: 5 * 1024 * 1024, processCredits: 32 * 1024 * 1024, maxActive: 4, maxActivePerUser: 2 }), /GROUP_TEST_POLICY_REQUIRES_TEST_ENV/);
        } finally { process.env.NODE_ENV = previous; }
      }
    });

    await t.test('explicit test admission accepts larger lossless source; default gate unchanged; atomic approval', async () => {
      const f = await fixture(1027);
      await assert.rejects(loadSource(f.projectId), errorCode('TRANSLATION_DRAFT_TOO_LARGE'));
      const ledger = new GroupAdmission({ sourceBytes: 128 * 1024, requestCredits: 5 * 1024 * 1024, processCredits: 32 * 1024 * 1024, maxActive: 4, maxActivePerUser: 2 });
      let expire: (() => void) | undefined, now = 0;
      const store = new GroupDraftStore(() => now, 1000, 50, callback => { expire = callback; return () => {}; });
      const service = new GroupTranslationService(provider, store, ledger);
      const source = await loadSource(f.projectId, null, ledger);
      assert.equal(source.segments.length, 1027);
      assert.ok(Buffer.byteLength(JSON.stringify(source)) > 98304);
      const result = await draft(f, service);
      assert.deepEqual(result.draft.groups.flatMap(g => g.sourceSegmentIds), source.segments.map(s => s.id));
      assert.equal(result.draft.sourceRevision, revision(source));
      assert.equal(ledger.snapshot().active, 0); assert.equal(ledger.snapshot().reservedCredits, ledger.policy.requestCredits);
      const approved = await service.approve(f.projectId, String(owner), result.draft.draftId, approval(result.draft));
      assert.equal(approved.translation.sourceSegmentCount, 1027);
      assert.equal(await Translation.countDocuments({ projectId: f.projectId, status: 'READY' }), 1);
      await ledger.operation(String(owner), async () => {
        const reader = await getTranslation(f.projectId, 'en', true);
        assert.equal(reader.sourceSegmentCount, 1027);
        // Real TTS entry validates the larger CURRENT source and stops safely
        // at missing fixture media, before voice/job/provider/file operations.
        await assert.rejects(generateNarration(f.projectId, String(owner), 'en'), errorCode('MEDIA_NOT_FOUND'));
      });
      assert.equal(await ProcessingJob.countDocuments({ projectId: f.projectId }), 0);
      await Translation.updateOne({ projectId: f.projectId }, { $set: { alignmentFormat: 'SEGMENTS_V1' } });
      await assert.rejects(ledger.operation(String(owner), () => getTranslation(f.projectId, 'en', true)), errorCode('TRANSLATION_FORMAT_UNSUPPORTED'));
      await Translation.updateOne({ projectId: f.projectId }, { $set: { alignmentFormat: 'GROUPS_V1' } });
      await assert.rejects(loadSource(f.projectId), errorCode('TRANSLATION_DRAFT_TOO_LARGE'));
      now = 1000; expire!(); assert.equal(ledger.snapshot().reservedCredits, 0);
    });

    await t.test('real projection/cursor, Unicode, ordered coverage and digest preservation', async ctx => {
      const f = await fixture(100);
      let closed = 0, seenBatch = 0;
      const original = TranscriptSegment.aggregate.bind(TranscriptSegment);
      ctx.mock.method(TranscriptSegment, 'aggregate', (pipeline: any) => {
        const aggregate = original(pipeline); const cursor = aggregate.cursor.bind(aggregate);
        ctx.mock.method(aggregate, 'cursor', (options: any) => {
          seenBatch = options.batchSize; const result = cursor(options); const close = result.close.bind(result);
          ctx.mock.method(result, 'close', async () => { closed++; return close(); }); return result;
        }); return aggregate;
      });
      const actual = await loadSource(f.projectId);
      const expected = { transcriptId: String(f.transcriptId), transcriptRevision: 1, languageCode: 'vi', fullText: f.segments.map(s => s.text).join(' '), segments: f.segments.map(s => ({ id: String(s._id), sequence: s.sequence, text: s.text, startTime: s.startTime, endTime: s.endTime })) };
      assert.deepEqual(actual, expected); assert.equal(revision(actual), revision(expected));
      assert.equal(seenBatch, 1); assert.ok(closed > 0);
    });
    await t.test('exact source JSON byte boundary and Unicode escapes; no truncation', async () => {
      const f = await fixture(1), s = await loadSource(f.projectId);
      s.fullText = 'Tiếng Việt "漢"\n';
      const padding = 98304 - Buffer.byteLength(JSON.stringify(s)); s.fullText += 'x'.repeat(padding);
      await Transcript.updateOne({ _id: f.transcriptId }, { $set: { fullText: s.fullText } });
      assert.equal(Buffer.byteLength(JSON.stringify(await loadSource(f.projectId))), 98304);
      await Transcript.updateOne({ _id: f.transcriptId }, { $set: { fullText: s.fullText + 'x' } });
      await assert.rejects(loadSource(f.projectId), errorCode('TRANSLATION_DRAFT_TOO_LARGE'));
      await Transcript.updateOne({ _id: f.transcriptId }, { $set: { fullText: 'x'.repeat(98305) } });
      assert.equal((await Transcript.aggregate([{ $match: { _id: f.transcriptId } }, { $project: { fullText: boundedTextProjection('fullText') } }]))[0].fullText, null);
      await assert.rejects(loadSource(f.projectId), errorCode('TRANSLATION_DRAFT_TOO_LARGE'));
    });
    await t.test('segment text overflow closes cursor; large source/count never returns partial result', async ctx => {
      const f = await fixture(1); await TranscriptSegment.updateOne({ _id: f.segments[0]!._id }, { $set: { text: 'x'.repeat(98305) } });
      let closed = 0; const original = TranscriptSegment.aggregate.bind(TranscriptSegment);
      ctx.mock.method(TranscriptSegment, 'aggregate', (pipeline: any) => { const aggregate = original(pipeline); const cursor = aggregate.cursor.bind(aggregate); ctx.mock.method(aggregate, 'cursor', (options: any) => { const result = cursor(options), close = result.close.bind(result); ctx.mock.method(result, 'close', async () => { closed++; return close(); }); return result; }); return aggregate; });
      await assert.rejects(loadSource(f.projectId), errorCode('TRANSLATION_DRAFT_TOO_LARGE')); assert.ok(closed > 0);
      const many = await fixture(10001);
      const count = await TranscriptSegment.countDocuments({ transcriptId: many.transcriptId }); assert.equal(count, 10001);
      // The tighter byte gate necessarily fires before the 10000-count gate.
      await assert.rejects(loadSource(many.projectId), errorCode('TRANSLATION_DRAFT_TOO_LARGE'));
    });
    await t.test('missing/deleted source and revision change during loading fail closed', async ctx => {
      const f = await fixture();
      await assert.rejects(loadSource(String(new Types.ObjectId())), errorCode('TRANSCRIPT_NOT_FOUND'));
      const original = Transcript.findOne.bind(Transcript); let changed = false;
      ctx.mock.method(Transcript, 'findOne', (...args: any[]) => {
        const query = (original as any)(...args);
        if (!changed && String(args[0]._id) === String(f.transcriptId)) query.pre(async () => { changed = true; await Transcript.collection.updateOne({ _id: f.transcriptId }, { $inc: { revision: 1 } }); });
        return query;
      });
      await assert.rejects(loadSource(f.projectId), errorCode('SOURCE_REVISION_MISMATCH'));
      await Transcript.deleteOne({ _id: f.transcriptId });
      await assert.rejects(loadSource(f.projectId), errorCode('TRANSCRIPT_NOT_FOUND'));
    });
    await t.test('plan/preview/draft/atomic approve/GET and duplicate approval persist correct provenance', async () => {
      const f = await fixture(), beforeCalls = providerCalls, d = await draft(f);
      assert.equal(await Translation.countDocuments({ projectId: f.projectId }), 0);
      assert.equal((await Project.findById(f.projectId))!.status, 'TRANSCRIBED');
      assert.equal(d.service.draft(f.projectId, String(owner), d.draft.draftId).outputDigest, d.draft.outputDigest);
      const [a, b] = await Promise.all([d.service.approve(f.projectId, String(owner), d.draft.draftId, approval(d.draft)), d.service.approve(f.projectId, String(owner), d.draft.draftId, approval(d.draft))]);
      assert.equal(a.translation.id, b.translation.id);
      assert.equal((await d.service.approve(f.projectId, String(owner), d.draft.draftId, approval(d.draft))).translation.id, a.translation.id);
      const saved = await getTranslation(f.projectId, 'en', true);
      assert.equal(saved.alignmentFormat, 'GROUPS_V1');
      assert.equal((saved as any).sourceSegmentCount, f.segments.length);
      assert.deepEqual((saved as any).groups.flatMap((g: any) => g.sourceSegmentIds), f.segments.map(s => String(s._id)));
      assert.equal((saved as any).sourceRevision, d.plan.sourceRevision);
      assert.equal((await Translation.findOne({ projectId: f.projectId }))!.status, 'READY');
      assert.equal((await Project.findById(f.projectId))!.status, 'TRANSLATED');
      assert.equal(await Translation.countDocuments({ projectId: f.projectId }), 1); assert.equal(providerCalls - beforeCalls, 1);
    });
    await t.test('concurrent approvals from separate stores revalidate after real transaction conflicts', async () => {
      const f = await fixture(), a = await draft(f), b = await draft(f);
      const results = await Promise.all([a.service.approve(f.projectId, String(owner), a.draft.draftId, approval(a.draft)), b.service.approve(f.projectId, String(owner), b.draft.draftId, approval(b.draft))]);
      assert.equal(results[0].translation.id, results[1].translation.id);
      assert.equal(await Translation.countDocuments({ projectId: f.projectId }), 1);
    });
    await t.test('injected failure after actual insert rolls back Translation and Project', async ctx => {
      const f = await fixture(), d = await draft(f), original = Translation.create.bind(Translation);
      ctx.mock.method(Translation, 'create', async (...args: any[]) => { await (original as any)(...args); throw new Error('INJECTED_AFTER_INSERT'); });
      await assert.rejects(d.service.approve(f.projectId, String(owner), d.draft.draftId, approval(d.draft)), /INJECTED_AFTER_INSERT/);
      assert.equal(await Translation.countDocuments({ projectId: f.projectId }), 0);
      assert.equal((await Project.findById(f.projectId))!.status, 'TRANSCRIBED');
    });
    await t.test('transient transaction retry does not repeat provider generation', async ctx => {
      const f = await fixture(), d = await draft(f), beforeCalls = providerCalls, original = Translation.create.bind(Translation); let attempts = 0;
      ctx.mock.method(Translation, 'create', async (...args: any[]) => {
        const result = await (original as any)(...args); attempts++;
        if (attempts === 1) { const error = new mongoose.mongo.MongoServerError({ message: 'SYNTHETIC_TRANSIENT' }); error.addErrorLabel('TransientTransactionError'); throw error; }
        return result;
      });
      await d.service.approve(f.projectId, String(owner), d.draft.draftId, approval(d.draft));
      assert.equal(attempts, 2); assert.equal(providerCalls, beforeCalls); assert.equal(await Translation.countDocuments({ projectId: f.projectId }), 1);
    });
    await t.test('duplicate-key conflict cannot overwrite another record or commit project status', async ctx => {
      const f = await fixture(), d = await draft(f), original = Translation.create.bind(Translation); let inserted = false;
      ctx.mock.method(Translation, 'create', async (...args: any[]) => {
        if (!inserted) { inserted = true; const values = args[0][0]; await Translation.collection.insertOne(new Translation({ ...values, review: { ...values.review, reviewedBy: other } }).toObject()); }
        return (original as any)(...args);
      });
      await assert.rejects(d.service.approve(f.projectId, String(owner), d.draft.draftId, approval(d.draft)), errorCode('TRANSLATION_ALREADY_EXISTS'));
      assert.equal(await Translation.countDocuments({ projectId: f.projectId }), 1);
      assert.equal(String((await Translation.findOne({ projectId: f.projectId }))!.review!.reviewedBy), String(other));
      assert.equal((await Project.findById(f.projectId))!.status, 'TRANSCRIBED');
    });
    await t.test('digest mismatch and approve/edit race never commit a CURRENT translation for old source', async ctx => {
      const f = await fixture(), d = await draft(f);
      await assert.rejects(d.service.approve(f.projectId, String(owner), d.draft.draftId, { outputDigest: '0'.repeat(64), reviewed: true }), errorCode('TRANSLATION_DRAFT_CHANGED'));
      const original = Transcript.updateOne.bind(Transcript); let edited = false;
      ctx.mock.method(Transcript, 'updateOne', async (...args: any[]) => {
        if (!edited && String(args[0]._id) === String(f.transcriptId) && args[1].$set?.revision === 1) {
          edited = true;
          await updateTranscriptSegment(f.projectId, String(owner), String(f.segments[0]!._id), 'Synthetic edited text', 1);
        }
        return (original as any)(...args);
      });
      await assert.rejects(d.service.approve(f.projectId, String(owner), d.draft.draftId, approval(d.draft)), errorCode('SOURCE_REVISION_MISMATCH'));
      assert.equal(await Translation.countDocuments({ projectId: f.projectId }), 0);
      assert.equal((await Transcript.findById(f.transcriptId))!.revision, 2);
      assert.equal((await Project.findById(f.projectId))!.status, 'TRANSCRIBED');
    });
    await t.test('approved record becomes STALE after later real edit; original artifact preserved', async () => {
      const f = await fixture(), d = await draft(f);
      await d.service.approve(f.projectId, String(owner), d.draft.draftId, approval(d.draft));
      await updateTranscriptSegment(f.projectId, String(owner), String(f.segments[0]!._id), 'Synthetic later edit', 1);
      await assert.rejects(d.service.preview(f.projectId, String(owner), d.body), errorCode('SOURCE_REVISION_MISMATCH'));
      await assert.rejects(d.service.preview(f.projectId, String(other), d.body), errorCode('PROJECT_NOT_FOUND'));
      await assert.rejects(getTranslation(f.projectId, 'en', true), errorCode('TRANSLATION_PROVENANCE_INVALID'));
      assert.equal(await Translation.countDocuments({ projectId: f.projectId }), 1);
    });
    await t.test('application HTTP stack warm-up and repeated MongoDB/SDK mock load at concurrency 1/4/16', { timeout: 90000 }, async ctx => {
      const oldKey = process.env.GEMINI_API_KEY, oldProvider = process.env.TRANSLATION_PROVIDER, oldModel = process.env.GEMINI_TRANSLATION_MODEL;
      process.env.GEMINI_API_KEY = 'synthetic-local-only'; process.env.TRANSLATION_PROVIDER = 'gemini'; process.env.GEMINI_TRANSLATION_MODEL = 'gemini-3.8-flash';
      let gate = Promise.resolve(), sdkCalls = new Map<string, number>(), metadata = 0;
      ctx.mock.method(globalThis, 'fetch', async (input: any, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.hostname === '127.0.0.1' && url.protocol === 'http:') return realFetch(input, init);
        if (url.hostname !== 'generativelanguage.googleapis.com' || url.protocol !== 'https:') throw new Error('EXTERNAL_HTTP_FORBIDDEN');
        const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
        if (url.pathname.endsWith('/models/gemini-3.8-flash') && (!init?.method || init.method === 'GET')) { metadata++; return json({ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }); }
        if (!url.pathname.endsWith('/models/gemini-3.8-flash:generateContent')) throw new Error('UNEXPECTED_SDK_MOCK_REQUEST');
        const request = JSON.parse(String(init?.body));
        const data = JSON.parse(request.contents[0].parts[0].text);
        const key = data.groups[0].groupId; sdkCalls.set(key, (sdkCalls.get(key) ?? 0) + 1);
        await gate;
        return json({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify({ outcome: 'translated', groups: data.groups.map((g: any) => ({ groupId: g.groupId, translatedText: 'Synthetic SDK English.' })) }) }] } }] });
      });
      try {
        const owners = [owner, other, new Types.ObjectId(), new Types.ObjectId()];
        for (const id of owners.slice(2)) { ids.users.push(id); await User.create({ _id: id, fullName: 'Synthetic load fixture', email: `${id}@integration.invalid`, passwordHash: 'synthetic', role: 'CUSTOMER', status: 'ACTIVE' }); }
        const scenarios = [{ round: 'warmup', concurrency: 1, count: 100 }, ...[1, 2].flatMap(round => [1, 4, 16].map(concurrency => ({ round: String(round), concurrency, count: 1027 })))];
        for (const { round, concurrency, count } of scenarios) {
          const admission = new GroupAdmission({ sourceBytes: 128 * 1024, requestCredits: 5 * 1024 * 1024, processCredits: 32 * 1024 * 1024, maxActive: 4, maxActivePerUser: 2 });
          let now = 0; const timers = new Set<() => void>();
          const store = new GroupDraftStore(() => now, 10000, 50, callback => { timers.add(callback); return () => { timers.delete(callback); }; });
          const service = new GroupTranslationService(new GeminiGroupTranslationProvider(), store, admission);
          // Same Helmet/CORS/1 MiB parsers/API/error stack as src/server.ts;
          // only the project controller composition is explicitly test-injected.
          const app = createApp(createApiRouter(createProjectRouter(groupProfileControllers(service, admission))));
          const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
          const address = server.address(); assert.ok(address && typeof address !== 'string');
          const base = `http://127.0.0.1:${address.port}/api/projects/`;
          const health = await realFetch(`http://127.0.0.1:${address.port}/api/health`);
          assert.equal(health.status, 200); assert.equal((await health.json() as any).data.database, 'connected');
          assert.equal(health.headers.get('x-powered-by'), null);
          assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
          const fs = await Promise.all(owners.map(id => fixture(count, id)));
          const responseBytes: number[] = [];
          const call = async (index: number, suffix: string, body?: unknown, signal?: AbortSignal, asOwner = owners[index]!) => {
            const response = await realFetch(base + fs[index]!.projectId + '/translations' + suffix, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${signAccessToken(String(asOwner), 'CUSTOMER')}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal });
            const text = await response.text(); responseBytes.push(Buffer.byteLength(text));
            return { status: response.status, body: JSON.parse(text) as any, index };
          };
          const bodies: any[] = [];
          try {
            for (let i = 0; i < fs.length; i++) { const plan = await call(i, '/plan/en'); assert.equal(plan.status, 200); bodies.push({ targetLanguage: 'en', sourceRevision: plan.body.data.plan.sourceRevision, groupingVersion: plan.body.data.plan.groupingVersion, groups: plan.body.data.plan.groups.map((g: any) => g.sourceSegmentIds), idempotencyKey: randomUUID() }); }
            let release!: () => void; gate = new Promise<void>(resolve => { release = resolve; }); sdkCalls = new Map(); metadata = 0;
            const baseline = process.memoryUsage();
            const started = performance.now();
            const peak = { rss: baseline.rss, heapUsed: baseline.heapUsed, external: baseline.external, arrayBuffers: baseline.arrayBuffers };
            let samples = 0;
            const sample = () => {
              samples++; const memory = process.memoryUsage();
              for (const key of ['rss', 'heapUsed', 'external', 'arrayBuffers'] as const) peak[key] = Math.max(peak[key], memory[key]);
            };
            const sampler = setInterval(sample, 10); sampler.unref();
            const abort = new AbortController();
            const requests = Array.from({ length: concurrency }, (_, i) => call(i % 4, '/preview', bodies[i % 4], i === 0 ? abort.signal : undefined).catch(() => ({ status: 0, body: null, index: i % 4 })));
            try {
              const deadline = Date.now() + 5000;
              while (!sdkCalls.size && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
              assert.ok(sdkCalls.size > 0);
              await new Promise(resolve => setTimeout(resolve, 150));
              const pending = process.memoryUsage(), held = admission.snapshot();
              assert.ok(held.active <= 4 && held.active > 0); assert.ok(held.reservedCredits <= 32 * 1024 * 1024);
              // Leave one viable response at concurrency=1; unit tests separately
              // prove early-disconnect holds until actual work settlement.
              if (concurrency > 1) { abort.abort(); await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(admission.snapshot().active, held.active); }
              release(); const responses = await Promise.all(requests);
              assert.ok([...sdkCalls.values()].every(count => count === 1), 'single-flight never repeats installed SDK generation');
              assert.equal(metadata, sdkCalls.size);
              assert.ok(responses.every(r => [0, 200, 503].includes(r.status)), JSON.stringify(responses.map(r => ({ status: r.status, error: r.body?.error?.code }))));
              const success = responses.find(r => r.status === 200); assert.ok(success);
              const d = success.body.data.draft;
              assert.equal(d.groups.flatMap((g: any) => g.sourceSegmentIds).length, count);
              assert.equal((await call(success.index, `/drafts/${d.draftId}`)).status, 200);
              assert.equal((await call(success.index, `/drafts/${d.draftId}/approve`, approval(d))).status, 200);
              const got = await call(success.index, '/en?format=groups-v1'); assert.equal(got.status, 200); assert.equal(got.body.data.translation.sourceSegmentCount, count);
              assert.equal((await call(success.index, '/en?format=groups-v1', undefined, undefined, new Types.ObjectId())).status, 401);
              assert.equal((await call(success.index, '/en?format=groups-v1', undefined, undefined, owners[(success.index + 1) % 4]!)).status, 404);
              const completed = process.memoryUsage(); sample();
              assert.equal(admission.snapshot().active, 0);
              // Oversized stored artifacts are rejected on MongoDB before hydration.
              await Translation.collection.updateOne({ projectId: new Types.ObjectId(fs[success.index]!.projectId) }, { $set: { fullText: 'x'.repeat(128 * 1024) } });
              assert.equal((await call(success.index, '/en?format=groups-v1')).status, 413);
              assert.equal((await call(success.index, `/drafts/${d.draftId}/approve`, approval(d))).status, 413);
              now = 10000; for (const expire of [...timers]) expire();
              assert.deepEqual(admission.snapshot(), { active: 0, reservedCredits: 0 });
              const cache = store as unknown as { drafts: Map<string, unknown>; requests: Map<string, unknown> };
              assert.equal(cache.drafts.size, 0); assert.equal(cache.requests.size, 0);
              assert.ok(responseBytes.every(bytes => bytes <= 256 * 1024));
              assert.equal(responseBytes.length, 4 + responses.filter(r => r.status !== 0).length + 7);
              await new Promise(resolve => setTimeout(resolve, 25)); sample();
              const final = process.memoryUsage();
              console.log('RUNTIME_PROFILE', JSON.stringify({ round, concurrency, count, node: process.version, heapLimit: getHeapStatistics().heap_size_limit, samples, elapsedMs: Math.round(performance.now() - started), sdkGenerations: sdkCalls.size, success: responses.filter(r => r.status === 200).length, rejected: responses.filter(r => r.status === 503).length, cancelled: responses.filter(r => r.status === 0).length, reservedPending: held.reservedCredits, reservedAfterTTL: admission.snapshot().reservedCredits, activeAfterTTL: admission.snapshot().active, draftsAfterTTL: cache.drafts.size, receiptsAfterTTL: cache.requests.size, responseMaxBytes: Math.max(...responseBytes), responseTotalBytes: responseBytes.reduce((a, b) => a + b, 0), baseline, peak, pending, completed, final, oomCrashTimeout: false }));
            } finally { clearInterval(sampler); release(); await Promise.allSettled(requests); }
          } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
        }
      } finally {
        if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
        if (oldProvider === undefined) delete process.env.TRANSLATION_PROVIDER; else process.env.TRANSLATION_PROVIDER = oldProvider;
        if (oldModel === undefined) delete process.env.GEMINI_TRANSLATION_MODEL; else process.env.GEMINI_TRANSLATION_MODEL = oldModel;
      }
    });
    await t.test('real JWT/CUSTOMER/ownership routes with actual fixture users', async () => {
      const f = await fixture(); const app = express(); app.use(express.json()); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
      const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
      const address = server.address(); assert.ok(address && typeof address !== 'string');
      const call = async (token?: string) => fetch(`http://127.0.0.1:${address.port}/api/projects/${f.projectId}/translations/plan/en`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
      try {
        assert.equal((await call()).status, 401);
        assert.equal((await call(signAccessToken(String(other), 'CUSTOMER'))).status, 404);
        assert.equal((await call(signAccessToken(String(owner), 'CUSTOMER'))).status, 200);
        await User.updateOne({ _id: owner }, { $set: { role: 'ADMIN' } });
        assert.equal((await call(signAccessToken(String(owner), 'ADMIN'))).status, 403);
        await User.updateOne({ _id: owner }, { $set: { role: 'CUSTOMER', deletedAt: new Date() } });
        assert.equal((await call(signAccessToken(String(owner), 'CUSTOMER'))).status, 401);
      } finally { await User.updateOne({ _id: owner }, { $set: { role: 'CUSTOMER', deletedAt: null } }); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
    });
  } finally {
    await Promise.allSettled(pendingLogs);
    // Enumerate every generated Translation/ActivityLog ID under this run's projects first.
    const translations = await Translation.find({ projectId: { $in: ids.projects } }).select('_id');
    const logs = await ActivityLog.find({ entityId: { $in: ids.projects }, userId: { $in: ids.users } }).select('_id');
    const collections = [
      [Translation.collection, translations.map(x => x._id)], [ActivityLog.collection, logs.map(x => x._id)],
      [TranscriptSegment.collection, ids.segments], [Transcript.collection, ids.transcripts], [Project.collection, ids.projects], [User.collection, ids.users], [Language.collection, ids.languages],
    ] as const;
    try {
      for (const [collection, targets] of collections) {
        for (let i = 0; i < targets.length; i += 500) await collection.deleteMany({ _id: { $in: targets.slice(i, i + 500) } });
        assert.equal(await collection.countDocuments({ _id: { $in: targets } }), 0);
      }
      console.log('FIXTURE_CLEANUP_PASS; development/production writes=0; Gemini calls=0');
    } finally { await mongoose.disconnect(); }
  }
});
