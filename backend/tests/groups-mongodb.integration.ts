// Explicit opt-in executable. Never included in ordinary *.test.ts discovery.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import mongoose, { Types } from 'mongoose';
import express from 'express';
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
const { revision } = await import('../src/services/translation/group-plan.js');
const { boundedTextProjection } = await import('../src/services/translation/bounded-source.js');
const { updateTranscriptSegment } = await import('../src/services/transcription.service.js');
const { getTranslation } = await import('../src/services/translation-processing.service.js');
const { projectRouter } = await import('../src/routes/project.routes.js');
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
  async function fixture(count = 30) {
    const projectId = new Types.ObjectId(), transcriptId = new Types.ObjectId(); ids.projects.push(projectId); ids.transcripts.push(transcriptId);
    const segments = Array.from({ length: count }, (_, i) => ({ _id: new Types.ObjectId(), transcriptId, sequence: i + 1,
      startTime: i / 4, endTime: (i + 1) / 4, text: `từ${i % 10}${(i + 1) % 14 === 0 ? '.' : ''}` }));
    ids.segments.push(...segments.map(s => s._id));
    await Project.create({ _id: projectId, userId: owner, name: `Synthetic ${run}`, sourceLanguage: 'vi', status: 'TRANSCRIBED' });
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
      await assert.rejects(getTranslation(f.projectId, 'en', true), errorCode('TRANSLATION_PROVENANCE_INVALID'));
      assert.equal(await Translation.countDocuments({ projectId: f.projectId }), 1);
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
