import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose, { Types } from 'mongoose';
Object.assign(process.env, { NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1:1/multilang_mock_only',
  JWT_ACCESS_SECRET: randomBytes(48).toString('hex'), JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
  JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '1d', CUSTOMER_TRANSLATION_ENABLED: 'true', GROUP_TRANSLATION_ENABLED: 'false',
  CUSTOMER_TRANSLATION_METHOD: 'GEMINI_SIMPLE_V1', CUSTOMER_TRANSLATION_THINKING: 'DEFAULT', TRANSLATION_PROVIDER: 'gemini',
  CUSTOMER_TRANSLATION_DAILY_USER_LIMIT: '20', CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT: '200', GEMINI_API_KEY: 'synthetic-only' });
delete process.env.CONTROLLED_PROVIDER_MODE;
mongoose.set('bufferCommands', false);
const { Project } = await import('../src/models/Project.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js');
const { Translation } = await import('../src/models/Translation.js');
const { TranslationAttempt } = await import('../src/models/TranslationAttempt.js');
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { Language } = await import('../src/models/Language.js');
const { User } = await import('../src/models/User.js');
const { GroupTranslationService, groupTranslationService } = await import('../src/services/translation/group-translation.service.js');
const { GroupDraftStore } = await import('../src/services/translation/group-draft-store.js');
const { customerAttempts, CustomerAttemptStore } = await import('../src/services/translation/customer-attempt.js');
const { customerDispatch, customerResponse } = await import('../src/services/translation/customer-execution.js');
const { digest, outputDigest } = await import('../src/services/translation/group-plan.js');
const { assertSimpleInput, simpleInstructionsFor, SIMPLE_INPUT_BYTES, SIMPLE_GROUP_BYTES, SIMPLE_GROUP_LIMIT } = await import('../src/services/translation/gemini-simple-contract.js');
const { assertCustomerLanguages } = await import('../src/services/translation/customer-languages.js');
const { GeminiGroupTranslationProvider, mapGroupResponse } = await import('../src/services/translation/gemini-group-translation.provider.js');
const { withCustomerTranslation, withCustomerMethod } = await import('../src/services/translation/customer-scope.js');
const { customerSimplePreflight } = await import('../src/services/translation/customer-simple-preflight.js');
const { readDurableProjectConflict } = await import('../src/services/translation/preflight-runtime-evidence.js');
const { projectRouter } = await import('../src/routes/project.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const { approveTranslationSchema, customerDraftSchema } = await import('../src/validators/translation.validator.js');
const { default: express } = await import('express');
const owner = '1'.repeat(24), projectId = '2'.repeat(24), transcriptId = '3'.repeat(24), segmentId = '4'.repeat(24);
const query = (value: any): any => ({ select: () => query(value), session: () => query(value), then: (done: any, reject: any) => Promise.resolve(value).then(done, reject) });
const code = (expected: string) => (error: any) => error.code === expected;
const texts: Record<string, string> = { vi: 'Di sản năm 1900.', en: 'Heritage in 1900.', ja: '1900年の文化遺産。', ko: '1900년의 문화유산입니다.', zh: '1900年的文化遗产。' };

function fixture(t: test.TestContext, sourceLanguage = 'vi', gate?: Promise<void>) {
  const project: any = { _id: new Types.ObjectId(projectId), userId: owner, sourceLanguage, sourceLanguageMode: 'MANUAL', sourceLanguageStatus: 'CONFIRMED', status: 'TRANSCRIBED' };
  const rows = new Map<string, any>(), saved = new Map<string, any>();
  let calls = 0, quotas = 0, writes = 0, running = false;
  const inputs: any[] = [];
  t.mock.method(mongoose, 'connect', () => { throw Error('DATABASE_FORBIDDEN'); });
  t.mock.method(globalThis, 'fetch', () => { throw Error('NETWORK_FORBIDDEN'); });
  t.mock.method(Project, 'findOne', (filter: any) => query(!filter.userId || filter.userId === owner ? project : null));
  t.mock.method(Project, 'findOneAndUpdate', (_filter: any, update: any) => {
    if (project.status === 'COMPLETED') return query(null);
    Object.assign(project, update.$set); return query(project);
  });
  t.mock.method(Transcript, 'aggregate', () => ({ session: () => query([{ _id: new Types.ObjectId(transcriptId), revision: 1, status: 'READY', sourceLanguageStatus: project.sourceLanguageStatus, languageCode: project.sourceLanguage, fullText: texts[project.sourceLanguage] }]) }) as never);
  t.mock.method(Transcript, 'findOne', () => query({ _id: new Types.ObjectId(transcriptId), revision: 1 }));
  t.mock.method(Transcript, 'updateOne', async () => ({ matchedCount: 1 }) as never);
  t.mock.method(TranscriptSegment, 'aggregate', () => ({ session: () => ({ cursor: () => ({ async *[Symbol.asyncIterator]() {
    yield { _id: new Types.ObjectId(segmentId), sequence: 1, text: texts[project.sourceLanguage], startTime: 0, endTime: 2 };
  }, async close() {} }) }) }) as never);
  t.mock.method(Language, 'exists', (filter: any) => query(['en', 'ja', 'ko', 'zh'].includes(filter.code) ? {} : null));
  t.mock.method(Translation, 'exists', (filter: any) => query(saved.has(filter.targetLanguage) ? {} : null));
  t.mock.method(Translation, 'findOne', (filter: any) => query(saved.get(filter.targetLanguage) ?? null));
  t.mock.method(Translation, 'create', async (documents: any[]) => {
    if (saved.has(documents[0].targetLanguage)) throw { code: 11000 };
    const document = new Translation(documents[0]); await document.validate();
    saved.set(document.targetLanguage, document); writes++; return [document] as never;
  });
  t.mock.method(ProcessingJob, 'exists', () => query(running ? {} : null));
  t.mock.method(mongoose, 'startSession', async () => ({ async withTransaction(work: () => Promise<unknown>) { return work(); }, async endSession() {} }) as never);
  const key = (scope: any) => digest(['CUSTOMER_TRANSLATION_V1', scope.ownerId, scope.projectId, scope.targetLanguage, scope.sourceRevision]);
  const repo = {
    read: async (scope: any) => rows.get(key(scope)) ?? null,
    claim: async (scope: any, binding: string) => { if (rows.has(key(scope))) throw { code: 11000 }; rows.set(key(scope), { ...scope, binding, state: 'CLAIMED', executionVersion: 1, updatedAt: new Date() }); },
    quota: async () => { quotas++; },
    record: async (scope: any, _binding: string, phase: string) => { rows.get(key(scope)).phase = phase; },
    fail: async () => true,
    finish: async (scope: any, _binding: string, draftJson: string) => Object.assign(rows.get(key(scope)), { state: 'DRAFT', draftJson }),
  };
  const ledger = new CustomerAttemptStore(repo as any);
  t.mock.method(customerAttempts, 'execute', ledger.execute.bind(ledger));
  t.mock.method(customerAttempts, 'read', ledger.read.bind(ledger));
  t.mock.method(customerAttempts, 'inspect', ledger.inspect.bind(ledger));
  const provider = { async translate(input: any, verify?: () => Promise<void>) {
    await verify?.(); assertSimpleInput(input); calls++; inputs.push(input); await gate;
    await customerDispatch('METADATA'); await customerResponse('METADATA'); await customerDispatch('GENERATION'); await customerResponse('GENERATION');
    return input.groups.map((group: any) => ({ groupId: group.groupId, translatedText: texts[input.targetLanguage] }));
  } };
  const service = new GroupTranslationService(provider, new GroupDraftStore());
  return { service, provider, project, rows, saved, inputs, counts: () => ({ calls, quotas, writes }), setRunning(value: boolean) { running = value; } };
}

for (const source of ['vi', 'en', 'ja', 'ko', 'zh']) for (const target of ['en', 'ja', 'ko', 'zh'].filter(target => target !== source)) {
  test(`SIMPLE ${source} -> ${target}: scope, coverage, prompt, digest and durable replay`, async t => {
    const f = fixture(t, source);
    const draft = await f.service.customerGenerate(projectId, owner, target);
    assert.equal(draft.sourceLanguage, source); assert.equal(draft.targetLanguage, target);
    assert.deepEqual(draft.groups[0]?.sourceSegmentIds, [segmentId]); assert.equal(draft.groups[0]?.startTime, 0); assert.equal(draft.groups[0]?.endTime, 2);
    assert.equal(draft.outputDigest, outputDigest(draft.sourceRevision, target, draft.groups));
    assert.match(simpleInstructionsFor(source, target), /proper names, places, dates, years, numbers and cultural heritage/);
    const names: Record<string, string> = { vi: 'Vietnamese', en: 'English', ja: 'Japanese', ko: 'Korean', zh: 'Simplified Chinese (简体中文)' };
    assert.ok(simpleInstructionsFor(source, target).startsWith(`Translate ${names[source]} to ${names[target]}.`));
    assert.equal((await f.service.customerGenerate(projectId, owner, target)).draftId, draft.draftId);
    const restarted = new GroupTranslationService(f.provider, new GroupDraftStore());
    assert.equal((await restarted.customerDraft(projectId, owner, target))?.draftId, draft.draftId);
    assert.equal((await restarted.customerState(projectId, owner, target)).targetLanguage, target);
    assert.deepEqual(f.counts(), { calls: 1, quotas: 1, writes: 0 });
  });
}

test('four targets isolate attempts, drafts, review/approval and existing translations; COMPLETED never reopens', async t => {
  const f = fixture(t);
  const drafts = [];
  for (const target of ['en', 'ja', 'ko', 'zh']) drafts.push(await f.service.customerGenerate(projectId, owner, target));
  assert.equal(new Set(drafts.map(draft => draft.draftId)).size, 4); assert.equal(f.rows.size, 4);
  const originalSourceRevisions = drafts.map(draft => draft.sourceRevision);
  assert.equal(new Set(originalSourceRevisions).size, 1);
  assert.equal(new Set(drafts.map(draft => draft.outputDigest)).size, 4);
  for (const draft of drafts) {
    const result = await withCustomerTranslation(() => f.service.approve(projectId, owner, draft.draftId, { reviewed: true, outputDigest: draft.outputDigest }));
    assert.equal(result.translation.targetLanguage, draft.targetLanguage);
    assert.equal(result.translation.fullText, texts[draft.targetLanguage]);
    assert.equal(f.project.status, 'TRANSLATED');
    const before = f.counts();
    await assert.rejects(f.service.customerGenerate(projectId, owner, draft.targetLanguage), code('TRANSLATION_ALREADY_EXISTS'));
    assert.deepEqual(f.counts(), before);
  }
  assert.equal(f.saved.size, 4); assert.deepEqual(f.counts(), { calls: 4, quotas: 4, writes: 4 });
  f.project.status = 'COMPLETED';
  await assert.rejects(f.service.customerGenerate(projectId, owner, 'ja'), code('INVALID_PROJECT_STATE'));
  assert.equal(f.project.status, 'COMPLETED');
  assert.equal((await f.service.customerDraft(projectId, owner, 'en'))?.targetLanguage, 'en');
  const en = drafts[0]!;
  // Customer approval requires the same scope as the controller; a developer's
  // .env must not enable the legacy group path and hide a missing scope here.
  await assert.rejects(f.service.approve(projectId, owner, en.draftId, { reviewed: true, outputDigest: en.outputDigest }), code('GROUP_TRANSLATION_DISABLED'));
  assert.equal(f.counts().writes, 4);
  const receipt = await withCustomerTranslation(() => f.service.approve(projectId, owner, en.draftId, { reviewed: true, outputDigest: en.outputDigest }));
  assert.equal(receipt.translation.targetLanguage, 'en'); assert.equal(f.project.status, 'COMPLETED'); assert.equal(f.counts().writes, 4);
});

test('source/target/owner/status guards run before claim or quota; method does not broaden GROUPS_V1', async t => {
  const f = fixture(t);
  await assert.rejects(f.service.customerGenerate(projectId, owner, 'vi'), code('SAME_SOURCE_TARGET_LANGUAGE'));
  for (const target of ['fr', 'auto', '', 'zh-TW']) await assert.rejects(f.service.customerGenerate(projectId, owner, target), code('TRANSLATION_LANGUAGE_NOT_SUPPORTED'));
  for (const language of ['en', 'ja', 'ko', 'zh']) {
    f.project.sourceLanguage = language;
    await assert.rejects(f.service.customerGenerate(projectId, owner, language), code('SAME_SOURCE_TARGET_LANGUAGE'));
  }
  f.project.sourceLanguage = 'vi'; f.project.sourceLanguageStatus = 'NEEDS_CONFIRMATION';
  await assert.rejects(f.service.customerGenerate(projectId, owner, 'ja'), code('SOURCE_LANGUAGE_UNCONFIRMED'));
  f.project.sourceLanguageStatus = 'CONFIRMED';
  await assert.rejects(f.service.customerGenerate(projectId, '9'.repeat(24), 'ja'), code('PROJECT_NOT_FOUND'));
  f.setRunning(true); await assert.rejects(f.service.customerGenerate(projectId, owner, 'ja'), code('TRANSLATION_CONFLICT'));
  assert.throws(() => assertCustomerLanguages('vi', 'ja', 'GROUPS_V1'), code('TRANSLATION_LANGUAGE_NOT_SUPPORTED'));
  assert.deepEqual(f.counts(), { calls: 0, quotas: 0, writes: 0 }); assert.equal(f.rows.size, 0);
});

test('different target cannot bypass owner concurrency lock', async t => {
  let release!: () => void; const gate = new Promise<void>(done => { release = done; });
  const f = fixture(t, 'vi', gate);
  const first = f.service.customerGenerate(projectId, owner, 'ja');
  while (!f.counts().calls) await new Promise(done => setImmediate(done));
  await assert.rejects(f.service.customerGenerate(projectId, owner, 'ko'), code('TRANSLATION_CAPACITY_EXHAUSTED'));
  release(); await first;
  assert.deepEqual(f.counts(), { calls: 1, quotas: 1, writes: 0 });
});

test('CJK admission uses UTF-8 bytes without raising existing bounds; coverage stays strict', () => {
  assert.equal(SIMPLE_INPUT_BYTES, 12000); assert.equal(SIMPLE_GROUP_BYTES, 2000); assert.equal(SIMPLE_GROUP_LIMIT, 32);
  const input = { sourceLanguage: 'ja', targetLanguage: 'zh', fullText: '文化遺産', groups: [{ groupId: 'g1', sourceText: '文'.repeat(666) }] };
  assertSimpleInput(input);
  assert.throws(() => assertSimpleInput({ ...input, groups: [{ groupId: 'g1', sourceText: '文'.repeat(667) }] }), code('TRANSLATION_SIMPLE_INPUT_LIMIT'));
  assert.throws(() => assertSimpleInput({ ...input, fullText: '文'.repeat(4001) }), code('TRANSLATION_SIMPLE_INPUT_LIMIT'));
  const good = { outcome: 'translated', groups: [{ groupId: 'g1', translatedText: texts.zh }] };
  assert.equal(mapGroupResponse(JSON.stringify(good), input)[0]?.translatedText, texts.zh);
  for (const groups of [[], [good.groups[0], good.groups[0]], [{ groupId: 'wrong', translatedText: texts.zh }]]) assert.throws(() => mapGroupResponse(JSON.stringify({ outcome: 'translated', groups }), input));
});

test('Schema validator rejects malformed language codes', () => {
  const params = { id: projectId, draftId: '11111111-1111-4111-8111-111111111111' };
  assert.equal(approveTranslationSchema.safeParse({ params, query: { targetLanguage: 'fr' }, body: { reviewed: true, outputDigest: 'a'.repeat(64) } }).success, true);
  assert.equal(approveTranslationSchema.safeParse({ params, query: { targetLanguage: 'de' }, body: { reviewed: true, outputDigest: 'a'.repeat(64) } }).success, true);
  assert.equal(customerDraftSchema.safeParse({ params: { id: projectId, targetLanguage: 'fr' } }).success, true);
  assert.equal(customerDraftSchema.safeParse({ params: { id: projectId, targetLanguage: 'toolongcode' } }).success, false);
  assert.equal(customerDraftSchema.safeParse({ params: { id: projectId, targetLanguage: '12' } }).success, false);
});

for (const target of ['en', 'ja', 'ko', 'zh']) test(`Gemini SDK mock ${target}: actual prompt direction, JSON contract and no forced thinking/format`, async t => {
  let posts = 0;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    if (init?.method !== 'POST') return Response.json({ supportedGenerationMethods: ['generateContent'] });
    posts++; const body = JSON.parse(String(init.body)); const prompt = body.systemInstruction.parts[0].text;
    assert.match(prompt, /^Translate Vietnamese to /); assert.match(prompt, /Copy every groupId exactly once/);
    if (target === 'zh') assert.match(prompt, /Simplified Chinese \/ 简体中文.*do not output Traditional Chinese/);
    if (target === 'ko') assert.match(prompt, /natural, polite Korean/);
    if (target === 'ja') assert.match(prompt, /natural Japanese/);
    assert.deepEqual(body.generationConfig, { candidateCount: 1, maxOutputTokens: 8192 });
    assert.equal(JSON.parse(body.contents[0].parts[0].text).targetLanguage, target);
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ outcome: 'translated', groups: [{ groupId: 'g1', translatedText: texts[target] }] }) }] } }] });
  });
  const input = { sourceLanguage: 'vi', targetLanguage: target, fullText: texts.vi!, groups: [{ groupId: 'g1', sourceText: texts.vi! }] };
  const result = await withCustomerTranslation(() => withCustomerMethod('GEMINI_SIMPLE_V1', () => new GeminiGroupTranslationProvider().translate(input)));
  assert.equal(result[0]?.translatedText, texts[target]); assert.equal(posts, 1);
});

test('preflight and durable conflict evidence bind selected target; other target does not conflict', async t => {
  const before = process.env.NODE_ENV; process.env.NODE_ENV = 'development';
  const calls: string[] = [];
  const source = { transcriptId, transcriptRevision: 1, languageCode: 'vi', fullText: texts.vi!, segments: [{ id: segmentId, sequence: 1, text: texts.vi!, startTime: 0, endTime: 2 }] };
  const deps: any = { owns: async () => true, project: async () => ({ status: 'TRANSCRIBED', sourceLanguage: 'vi' }), load: async () => source,
    translation: async (_id: string, target: string) => { calls.push(target); return target === 'en'; }, jobs: async () => false,
    attempt: async (scope: any) => { calls.push(scope.targetLanguage); return null; }, drafts: (_id: string, target: string) => { calls.push(target); return { count: 0 }; },
    quota: async () => ({ status: 'VERIFIED', available: true }), deployment: async () => ({ status: 'VERIFIED', intendedTargetApproval: 'APPROVED_BY_USER', approvedDatabaseMatch: true }),
    durableConflicts: async (_id: string, _owner: string, target: string) => { calls.push(target); return { status: 'CLEAR' }; } };
  try {
    const ja = await customerSimplePreflight(projectId, owner, deps, 'ja'); assert.equal(ja.status, 'READY'); assert.equal(ja.targetLanguage, 'ja');
    assert.ok(calls.every(target => target === 'ja')); assert.equal(ja.persistedTranslation, 'CLEAR');
    const en = await customerSimplePreflight(projectId, owner, deps); assert.equal(en.status, 'BLOCKED'); assert.equal(en.persistedEnglish, 'BLOCKED');
    deps.project = async () => ({ status: 'COMPLETED', sourceLanguage: 'vi' });
    assert.ok((await customerSimplePreflight(projectId, owner, deps, 'ja')).reasonCodes.includes('INVALID_PROJECT_STATE'));
    t.mock.method(TranslationAttempt.collection, 'findOne', async (filter: any) => { assert.equal(filter.targetLanguage, 'ko'); return null; });
    assert.equal((await readDurableProjectConflict(projectId, owner, 'ko')).status, 'CLEAR');
  } finally { process.env.NODE_ENV = before; }
});

test('real JWT routes forward target and reject cross-target draft approval before any write (mock services)', async t => {
  t.mock.method(Project, 'findOne', () => query({ _id: new Types.ObjectId(projectId) }));
  t.mock.method(User, 'findOne', async () => ({ _id: new Types.ObjectId(owner), role: 'CUSTOMER', status: 'ACTIVE', fullName: 'Fixture' }) as never);
  let selected = '', approvals = 0;
  t.mock.method(groupTranslationService, 'customerGenerate', async (_id: string, _owner: string, target = 'en') => { selected = target; return {} as never; });
  t.mock.method(groupTranslationService, 'customerState', async (_id: string, _owner: string, target = 'en') => { selected = target; return { targetLanguage: target, draft: null, attempt: null }; });
  const draftId = '11111111-1111-4111-8111-111111111111';
  t.mock.method(groupTranslationService, 'customerDraft', async (_id: string, _owner: string, target = 'en') => target === 'ja' ? { draftId } as never : null);
  t.mock.method(groupTranslationService, 'approve', async () => { approvals++; return {} as never; });
  const app = express(); app.use(express.json()); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(done => server.once('listening', done)); const address = server.address(); assert.ok(address && typeof address !== 'string');
  const token = signAccessToken(owner, 'CUSTOMER');
  // Local server requests only; no provider or database connection.
  const call = (path: string, body?: unknown) => fetch(`http://127.0.0.1:${address.port}/api/projects/${projectId}/translations${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  try {
    for (const target of ['en', 'ja', 'ko', 'zh']) {
      assert.equal((await call('', { targetLanguage: target, format: 'GROUPS_V1' })).status, 200); assert.equal(selected, target);
      assert.equal((await call(`/customer-draft/${target}`)).status, 200); assert.equal(selected, target);
    }
    assert.equal((await call('/customer-draft/fr')).status, 200); // fr is now a valid catalog language
    assert.equal((await call('/customer-draft/toolongcode')).status, 400); // malformed code rejected at router level
    const body = { reviewed: true, outputDigest: 'a'.repeat(64) };
    assert.equal((await call(`/drafts/${draftId}/approve?targetLanguage=ko`, body)).status, 409); assert.equal(approvals, 0);
    assert.equal((await call(`/drafts/${draftId}/approve?targetLanguage=ja`, body)).status, 200); assert.equal(approvals, 1);
  } finally { await new Promise<void>((done, fail) => server.close(error => error ? fail(error) : done())); }
});

