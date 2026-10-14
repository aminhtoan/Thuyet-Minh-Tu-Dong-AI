import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import mongoose, { Types } from 'mongoose';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/group_translation_mock_only';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex'); process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.GROUP_TRANSLATION_ENABLED = 'true';
const { candidateGroups, validatePlan, revision, outputDigest, assertStoredGroups, digest } = await import('../src/services/translation/group-plan.js');
const { GroupDraftStore } = await import('../src/services/translation/group-draft-store.js');
const { GroupTranslationService, groupTranslationService, assertApprovedCurrent } = await import('../src/services/translation/group-translation.service.js');
const { mapGroupResponse, GeminiGroupTranslationProvider } = await import('../src/services/translation/gemini-group-translation.provider.js');
const { previewTranslationSchema, approveTranslationSchema } = await import('../src/validators/translation.validator.js');
const { Project } = await import('../src/models/Project.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js');
const { Translation } = await import('../src/models/Translation.js');
const { TranslationSegment } = await import('../src/models/TranslationSegment.js');
const { Language } = await import('../src/models/Language.js');
const { User } = await import('../src/models/User.js');
const { generate } = await import('../src/services/narration.service.js');
const { getTranslation, translate } = await import('../src/services/translation-processing.service.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const { projectRouter } = await import('../src/routes/project.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { default: express } = await import('express');
const source = () => ({ transcriptId: new Types.ObjectId().toString(), languageCode: 'vi', fullText: 'Trường Tiểu học ở tỉnh Vĩnh Long.', segments: ['Trường', 'Tiểu', 'học', 'ở', 'tỉnh', 'Vĩnh', 'Long.'].map((text, i) => ({ id: new Types.ObjectId().toString(), sequence: i + 1, text, startTime: i / 2, endTime: (i + 1) / 2 })) });
const code = (expected: string) => (error: any) => error.code === expected;

test('canonical revision, grouping coverage/order/punctuation/pause and immutable source', () => {
  const s = source(), before = JSON.stringify(s);
  assert.equal(candidateGroups(s).length, 1);
  const g = candidateGroups(s)[0]!; assert.deepEqual(g.sourceSegmentIds, s.segments.map(v => v.id)); assert.equal(g.startTime, 0); assert.equal(g.endTime, 3.5);
  assert.equal(g.sourceText, s.fullText); assert.equal(JSON.stringify(s), before);
  assert.equal(digest({ a: 1, b: 2 }), digest({ b: 2, a: 1 }));
  const changed = structuredClone(s); changed.segments[0]!.text = 'Trường mới'; assert.notEqual(revision(s), revision(changed));
  s.segments[2]!.text = 'học.'; assert.equal(candidateGroups(s).length, 2);
  s.segments[2]!.text = 'học'; s.segments.slice(3).forEach(v => { v.startTime += 1; v.endTime += 1; }); assert.equal(candidateGroups(s).length, 2);
});
test('merge-only plans reject missing, duplicated, reordered IDs and splitting candidates', () => {
  const s = source(), ids = s.segments.map(v => v.id);
  for (const membership of [[ids.slice(1)], [[ids[0]!], ...[ids]], [[...ids].reverse()], [ids.slice(0, 2), ids.slice(2)]]) assert.throws(() => validatePlan(s, membership));
  s.segments[2]!.text = 'học.';
  assert.equal(validatePlan(s, [ids]).length, 1); assert.equal(validatePlan(s, candidateGroups(s).map(g => g.sourceSegmentIds)).length, 2);
  const groups = validatePlan(s, [ids]).map(g => ({ ...g, translatedText: 'The primary school is in Vinh Long province.' }));
  assert.doesNotThrow(() => assertStoredGroups(s, groups)); groups[0]!.startTime += .1; assert.throws(() => assertStoredGroups(s, groups));
});
test('source times, sequence and blank content fail closed', () => {
  for (const change of [(s: any) => { s.segments[1].startTime = 0; }, (s: any) => { s.segments[0].endTime = -1; }, (s: any) => { s.segments[0].sequence = 2; }, (s: any) => { s.fullText = ''; }, (s: any) => { s.segments[0].text = ''; }]) { const s = source(); change(s); assert.throws(() => candidateGroups(s)); }
});
test('21 word segments retain IDs/text/times; two heuristic candidates may merge into one sentence', () => {
  const s = source();
  const words = Array.from({ length: 21 }, (_, i) => i === 20 ? 'Long.' : `từ${i + 1}`);
  s.fullText = words.join(' '); s.segments = words.map((text, i) => ({ id: new Types.ObjectId().toString(), sequence: i + 1, text, startTime: i / 3, endTime: (i + 1) / 3 }));
  const before = JSON.stringify(s), candidates = candidateGroups(s);
  assert.equal(candidates.length, 2); assert.equal(candidates[0]!.sourceSegmentIds.length, 18);
  const merged = validatePlan(s, [s.segments.map(v => v.id)]);
  assert.equal(merged.length, 1); assert.equal(merged[0]!.sourceText, s.fullText); assert.equal(merged[0]!.sourceSegmentIds.length, 21);
  assert.equal(merged[0]!.endTime, s.segments[20]!.endTime); assert.equal(JSON.stringify(s), before);
});
test('bounded draft bytes and expiration during generation reject without keeping a draft', async () => {
  let now = 0; const s = source();
  const value = { ownerId: 'owner', projectId: 'project', transcriptId: s.transcriptId, sourceLanguage: 'vi', targetLanguage: 'en', sourceRevision: revision(s), groupingVersion: 'phrase-candidates-v1', groups: candidateGroups(s), outputDigest: 'digest' };
  const large = new GroupDraftStore();
  await assert.rejects(large.preview('bytes', 'signature', async () => ({ ...value, groups: value.groups.map(g => ({ ...g, translatedText: 'x'.repeat(128 * 1024) })) })), code('TRANSLATION_DRAFT_TOO_LARGE'));
  const expired = new GroupDraftStore(() => now, 1000);
  await assert.rejects(expired.preview('expired', 'signature', async () => { now = 1001; return value; }), code('TRANSLATION_DRAFT_EXPIRED'));
});
test('provider mapping rejects refusals, missing/reordered/duplicate/extra metadata and empty text', () => {
  const s = source(); s.segments[2]!.text += '.';
  const input = { fullText: s.fullText, sourceLanguage: 'vi', targetLanguage: 'en', groups: candidateGroups(s).map(g => ({ groupId: g.groupId, sourceText: g.sourceText })) };
  const valid = input.groups.map(g => ({ groupId: g.groupId, translatedText: 'English text' }));
  assert.equal(mapGroupResponse(JSON.stringify({ outcome: 'translated', groups: valid }), input).length, 2);
  for (const output of [{ outcome: 'unable_to_align', groups: [] }, { outcome: 'translated', groups: [] }, { outcome: 'translated', groups: [...valid].reverse() }, { outcome: 'translated', groups: [valid[0], valid[0]] }, { outcome: 'translated', groups: [{ ...valid[0], startTime: 0 }, valid[1]] }, { outcome: 'translated', groups: [{ ...valid[0], translatedText: '' }, valid[1]] }]) assert.throws(() => mapGroupResponse(JSON.stringify(output), input));
  assert.throws(() => mapGroupResponse('not JSON', input));
});
test('draft TTL, capacity, scoped IDs, restart, no retries, clone safety and concurrent single-flight', async () => {
  let now = 0, calls = 0;
  const store = new GroupDraftStore(() => now, 1000, 1), s = source();
  const value = { ownerId: 'owner', projectId: 'project', transcriptId: s.transcriptId, sourceLanguage: 'vi', targetLanguage: 'en', sourceRevision: revision(s), groupingVersion: 'phrase-candidates-v1', groups: candidateGroups(s), outputDigest: 'digest' };
  const create = async () => { calls++; return value; };
  const [a, b] = await Promise.all([store.preview('key', 'signature', create), store.preview('key', 'signature', create)]);
  assert.equal(calls, 1); assert.equal(a.draftId, b.draftId);
  a.groups[0]!.sourceText = 'changed'; assert.notEqual(store.get(a.draftId, 'owner', 'project').groups[0]!.sourceText, 'changed');
  assert.throws(() => store.get(a.draftId, 'other', 'project')); assert.throws(() => store.get(a.draftId, 'owner', 'other'));
  await assert.rejects(store.preview('key', 'different', create), code('TRANSLATION_DRAFT_CHANGED'));
  await assert.rejects(store.preview('other', 'signature', create), code('TRANSLATION_DRAFT_CAPACITY'));
  assert.throws(() => new GroupDraftStore().get(a.draftId, 'owner', 'project')); now = 1001; assert.throws(() => store.get(a.draftId, 'owner', 'project'));
  let failedCalls = 0;
  const fail = async () => { failedCalls++; throw new Error('mock quota'); };
  await assert.rejects(store.preview('failed', 'signature', fail)); await assert.rejects(store.preview('failed', 'signature', fail)); assert.equal(failedCalls, 1);
});
test('strict payloads cannot inject reviewer, role, translations or source timestamps', () => {
  const s = source(); const params = { id: new Types.ObjectId().toString() };
  const body = { targetLanguage: 'en', sourceRevision: revision(s), groupingVersion: 'phrase-candidates-v1', groups: [s.segments.map(v => v.id)], idempotencyKey: randomUUID() };
  assert.ok(previewTranslationSchema.safeParse({ params, body }).success);
  assert.equal(previewTranslationSchema.safeParse({ params, body: { ...body, role: 'ADMIN' } }).success, false);
  const approve = { params: { ...params, draftId: randomUUID() }, body: { outputDigest: 'a'.repeat(64), reviewed: true } };
  assert.ok(approveTranslationSchema.safeParse(approve).success);
  assert.equal(approveTranslationSchema.safeParse({ ...approve, body: { ...approve.body, reviewedBy: 'other' } }).success, false);
  assert.equal(approveTranslationSchema.safeParse({ ...approve, body: { ...approve.body, reviewed: false } }).success, false);
});
test('schema legacy remains valid and grouped records require manual approval', async () => {
  const base = { projectId: new Types.ObjectId(), transcriptId: new Types.ObjectId(), sourceLanguage: 'vi', targetLanguage: 'en', fullText: 'Hello' };
  await new Translation(base).validate(); await assert.rejects(new Translation({ ...base, alignmentFormat: 'GROUPS_V1' }).validate());
});

test('service and real JWT routes with mock persistence only: preview/approve/legacy/TTS', async t => {
  const s = source(), owner = new Types.ObjectId().toString(), other = new Types.ObjectId().toString(), projectId = new Types.ObjectId().toString();
  const project = { _id: new Types.ObjectId(projectId), userId: owner, sourceLanguage: 'vi', status: 'TRANSCRIBED' };
  const user = { _id: new Types.ObjectId(owner), fullName: 'Test only', role: 'CUSTOMER', status: 'ACTIVE' };
  let persisted: any = null, writes = 0, generations = 0;
  const query = (value: any) => ({ sort() { return this; }, select() { return this; }, session() { return this; }, then(resolve: any, reject: any) { return Promise.resolve(value).then(resolve, reject); } });
  t.mock.method(mongoose, 'connect', () => { assert.fail('Database connection forbidden'); });
  t.mock.method(Project, 'findOne', (filter: any) => query(filter._id === projectId && filter.userId === owner ? project : null));
  t.mock.method(Project, 'findOneAndUpdate', () => query(project));
  t.mock.method(Transcript, 'findOne', () => query({ _id: new Types.ObjectId(s.transcriptId), languageCode: s.languageCode, fullText: s.fullText, status: 'READY' }));
  t.mock.method(TranscriptSegment, 'find', () => query(s.segments.map(v => ({ ...v, _id: new Types.ObjectId(v.id) }))));
  t.mock.method(Language, 'exists', (f: any) => query(f.code === 'en' ? { _id: 'lang' } : null));
  t.mock.method(Translation, 'findOne', () => query(persisted)); t.mock.method(Translation, 'exists', () => query(persisted ? { _id: persisted._id } : null));
  t.mock.method(Translation, 'create', async (rows: any[]) => { writes++; persisted = new Translation(rows[0]); await persisted.validate(); return [persisted]; });
  t.mock.method(TranslationSegment, 'find', () => query(s.segments.map(v => ({ transcriptSegmentId: new Types.ObjectId(v.id), translatedText: 'Legacy text' }))));
  t.mock.method(TranslationSegment, 'countDocuments', async () => s.segments.length);
  t.mock.method(mongoose, 'startSession', async () => ({ async withTransaction(fn: () => Promise<void>) { await fn(); }, async endSession() {} }));
  const provider = { async translate(input: any) { generations++; return input.groups.map((g: any) => ({ groupId: g.groupId, translatedText: 'The primary school is in Vinh Long province.' })); } };
  const service = new GroupTranslationService(provider, new GroupDraftStore());
  const before = JSON.stringify(s);
  const plan = await service.plan(projectId, owner, 'en');
  const body = { targetLanguage: 'en', sourceRevision: plan.sourceRevision, groupingVersion: plan.groupingVersion, groups: plan.groups.map(g => g.sourceSegmentIds), idempotencyKey: randomUUID() };
  let draft: any;
  await t.test('preview no writes/status change; duplicate preview one generation', async () => {
    [draft] = await Promise.all([service.preview(projectId, owner, body), service.preview(projectId, owner, body)]);
    assert.equal(writes, 0); assert.equal(generations, 1); assert.equal(project.status, 'TRANSCRIBED'); assert.equal(draft.state, 'DRAFT'); assert.equal(JSON.stringify(s), before);
  });
  await t.test('invalid plan/revision/language and ownership rejected without AI', async () => {
    await assert.rejects(service.preview(projectId, owner, { ...body, sourceRevision: '0'.repeat(64) }), code('SOURCE_REVISION_MISMATCH'));
    await assert.rejects(service.preview(projectId, owner, { ...body, groups: [[s.segments[0]!.id]] }), code('TRANSLATION_MAPPING_FAILED'));
    await assert.rejects(service.plan(projectId, other, 'en'), code('PROJECT_NOT_FOUND'));
    await assert.rejects(service.plan(projectId, owner, 'xx'), code('TRANSLATION_LANGUAGE_NOT_SUPPORTED')); assert.equal(generations, 1);
  });
  await t.test('manual review/digest/source change fail closed; no save', async () => {
    await assert.rejects(service.approve(projectId, owner, draft.draftId, { outputDigest: draft.outputDigest, reviewed: false } as any), code('TRANSLATION_REVIEW_REQUIRED'));
    await assert.rejects(service.approve(projectId, owner, draft.draftId, { outputDigest: '0'.repeat(64), reviewed: true }), code('TRANSLATION_DRAFT_CHANGED'));
    s.segments[0]!.text += ' mới';
    await assert.rejects(service.approve(projectId, owner, draft.draftId, { outputDigest: draft.outputDigest, reviewed: true }), code('SOURCE_REVISION_MISMATCH')); s.segments[0]!.text = 'Trường';
    assert.equal(writes, 0);
  });
  await t.test('concurrent approve and repeated receipt insert once, no source changes or AI', async () => {
    const request = { outputDigest: draft.outputDigest, reviewed: true as const };
    const [a, b] = await Promise.all([service.approve(projectId, owner, draft.draftId, request), service.approve(projectId, owner, draft.draftId, request)]);
    assert.equal(a.translation.id, b.translation.id); assert.equal((await service.approve(projectId, owner, draft.draftId, request)).translation.id, a.translation.id);
    assert.equal(writes, 1); assert.equal(generations, 1); assert.equal(JSON.stringify(s), before); assert.equal(persisted.review.method, 'MANUAL_V1');
    assert.equal(persisted.groups[0].sourceSegmentIds.length, 7); assert.equal(persisted.fullText, 'The primary school is in Vinh Long province.');
    assert.equal(persisted.review.outputDigest, outputDigest(draft.sourceRevision, 'en', draft.groups));
    project.status = 'GENERATING_AUDIO'; assert.equal((await service.approve(projectId, owner, draft.draftId, request)).translation.id, a.translation.id);
    assert.equal(project.status, 'GENERATING_AUDIO'); project.status = 'TRANSCRIBED'; assert.equal(writes, 1);
  });
  await t.test('format negotiation and no legacy overwrite; TTS approved/current only', async () => {
    await assert.rejects(getTranslation(projectId, 'en'), code('TRANSLATION_FORMAT_UNSUPPORTED'));
    assert.equal((await getTranslation(projectId, 'en', true)).alignmentFormat, 'GROUPS_V1');
    await assert.rejects(translate(projectId, owner, 'en'), code('TRANSLATION_ALREADY_EXISTS'));
    assert.doesNotThrow(() => assertApprovedCurrent(persisted, s));
    const review = persisted.review; persisted.review = undefined;
    await assert.rejects(generate(projectId, owner, 'en'), code('TRANSLATION_REVIEW_REQUIRED')); persisted.review = review;
    s.segments[0]!.text += ' khác'; await assert.rejects(generate(projectId, owner, 'en'), code('SOURCE_REVISION_MISMATCH')); s.segments[0]!.text = 'Trường';
    const grouped = persisted; persisted = { ...grouped.toObject(), alignmentFormat: undefined };
    assert.equal((await getTranslation(projectId, 'en')).segments?.length, 7); persisted = grouped;
  });
  await t.test('existing target prevents preview/overwrite; different approved digest rejected', async () => {
    await assert.rejects(service.plan(projectId, owner, 'en'), code('TRANSLATION_ALREADY_EXISTS'));
    const oldDigest = persisted.review.outputDigest; persisted.review.outputDigest = '0'.repeat(64);
    await assert.rejects(service.approve(projectId, owner, draft.draftId, { outputDigest: draft.outputDigest, reviewed: true }), code('TRANSLATION_ALREADY_EXISTS')); persisted.review.outputDigest = oldDigest;
    assert.equal(writes, 1); assert.equal(generations, 1);
  });
  await t.test('duplicate-key race cannot overwrite or retry a write', async () => {
    const old = persisted; persisted = null;
    t.mock.method(Translation, 'create', async () => { throw { code: 11000 }; });
    await assert.rejects(service.approve(projectId, owner, draft.draftId, { outputDigest: draft.outputDigest, reviewed: true }), code('TRANSLATION_ALREADY_EXISTS'));
    assert.equal(writes, 1); persisted = old;
  });
  t.mock.method(User, 'findById', async (id: string) => ({ ...user, _id: new Types.ObjectId(id) }));
  const app = express(); app.use(express.json()); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const token = signAccessToken(owner, 'CUSTOMER');
  const call = async (path: string, auth?: string, payload?: unknown) => {
    const res = await fetch(`http://127.0.0.1:${address.port}/api/projects/${projectId}/translations/${path}`, { method: payload ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth}` } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
    return { status: res.status, body: await res.json() as any };
  };
  try {
    await t.test('all new routes authenticate and reject cross owner, blocked user and ADMIN', async () => {
      for (const [path, payload] of [['plan/en', undefined], ['preview', body], [`drafts/${draft.draftId}`, undefined], [`drafts/${draft.draftId}/approve`, { outputDigest: draft.outputDigest, reviewed: true }]] as const) {
        assert.equal((await call(path, undefined, payload)).status, 401);
        assert.equal((await call(path, signAccessToken(other, 'CUSTOMER'), payload)).status, 404);
        user.status = 'BLOCKED'; assert.equal((await call(path, token, payload)).status, 403); user.status = 'ACTIVE';
        user.role = 'ADMIN'; assert.equal((await call(path, token, payload)).status, 403); user.role = 'CUSTOMER';
      }
    });
    await t.test('authorized grouped GET and feature off without writes/AI; invalid params/payload', async () => {
      assert.equal((await call('en?format=groups-v1', token)).status, 200);
      assert.equal((await call('drafts/not-uuid', token)).status, 400);
      assert.equal((await call('preview', token, { ...body, reviewedBy: other })).status, 400);
      process.env.GROUP_TRANSLATION_ENABLED = 'false'; assert.equal((await call('plan/en', token)).body.error.code, 'GROUP_TRANSLATION_DISABLED'); process.env.GROUP_TRANSLATION_ENABLED = 'true';
      // The route singleton is never allowed to reach real Gemini in this suite.
      t.mock.method(groupTranslationService, 'draft', () => draft);
      assert.equal((await call(`drafts/${draft.draftId}`, token)).body.data.draft.state, 'DRAFT'); assert.equal(writes, 1); assert.equal(generations, 1);
    });
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});

test('mock transport: one metadata + one generation, quota/timeout never retried', async () => {
  const oldKey = process.env.GEMINI_API_KEY; const oldProvider = process.env.TRANSLATION_PROVIDER;
  process.env.GEMINI_API_KEY = 'unit-test-placeholder'; process.env.TRANSLATION_PROVIDER = 'gemini';
  let metadata = 0, generated = 0, mode = 'ok';
  const transport = {
    async metadata() { metadata++; return { supportedActions: ['generateContent'] }; },
    async generate(_model: string, input: any) { generated++; if (mode === 'quota') throw { status: 429 }; if (mode === 'timeout') throw { name: 'TimeoutError' }; if (mode === 'truncated') return { finishReason: 'MAX_TOKENS' }; return { finishReason: 'STOP', text: JSON.stringify({ outcome: 'translated', groups: input.groups.map((g: any) => ({ groupId: g.groupId, translatedText: 'School' })) }) }; },
  };
  const provider = new GeminiGroupTranslationProvider(transport);
  const input = { fullText: 'Trường học', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: 'group', sourceText: 'Trường học' }] };
  try {
    assert.equal((await provider.translate(input))[0]!.translatedText, 'School'); assert.equal(metadata, 1); assert.equal(generated, 1);
    mode = 'quota'; await assert.rejects(provider.translate(input), code('TRANSLATION_QUOTA_EXCEEDED')); assert.equal(generated, 2);
    mode = 'timeout'; await assert.rejects(provider.translate(input), code('TRANSLATION_TIMEOUT')); assert.equal(generated, 3);
    mode = 'truncated'; await assert.rejects(provider.translate(input), code('TRANSLATION_INVALID_RESPONSE')); assert.equal(generated, 4);
    delete process.env.GEMINI_API_KEY; await assert.rejects(provider.translate(input), code('TRANSLATION_NOT_CONFIGURED')); assert.equal(generated, 4);
  } finally { if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; if (oldProvider === undefined) delete process.env.TRANSLATION_PROVIDER; else process.env.TRANSLATION_PROVIDER = oldProvider; }
});
