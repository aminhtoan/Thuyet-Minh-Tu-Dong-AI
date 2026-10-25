import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import mongoose, { Types } from 'mongoose';
import { Project } from '../src/models/Project.js';
import { Media } from '../src/models/Media.js';
import { Transcript } from '../src/models/Transcript.js';
import { TranscriptSegment } from '../src/models/TranscriptSegment.js';
import { Translation } from '../src/models/Translation.js';
import { TranslationAttempt } from '../src/models/TranslationAttempt.js';
import { ProcessingJob } from '../src/models/ProcessingJob.js';
import { Language } from '../src/models/Language.js';
import { GroupTranslationService } from '../src/services/translation/group-translation.service.js';
import { GroupDraftStore, type GroupDraft } from '../src/services/translation/group-draft-store.js';
import { CustomerAttemptStore } from '../src/services/translation/customer-attempt.js';
import { customerDispatch, customerResponse } from '../src/services/translation/customer-execution.js';
import { TranslationProviderFailure } from '../src/services/translation/provider-failure.js';
import { GeminiGroupTranslationProvider } from '../src/services/translation/gemini-group-translation.provider.js';
import { withCustomerTranslation } from '../src/services/translation/customer-scope.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const query = (value: unknown): any => ({ select() { return this; }, session() { return this; }, then(resolve: any, reject: any) { return Promise.resolve(value).then(resolve, reject); } });
function fixture(t: test.TestContext) {
  const previous = { ...process.env };
  Object.assign(process.env, { NODE_ENV: 'test', CUSTOMER_TRANSLATION_ENABLED: 'true', CUSTOMER_TRANSLATION_METHOD: 'GEMINI_SIMPLE_V1', CUSTOMER_TRANSLATION_THINKING: 'DEFAULT', CUSTOMER_TRANSLATION_MODEL_SELECTION: 'PRIMARY', GROUP_TRANSLATION_ENABLED: 'false', GEMINI_TRANSLATION_MODEL: 'gemini-3.8-flash', CUSTOMER_TRANSLATION_DAILY_USER_LIMIT: '20', CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT: '200' });
  delete process.env.CONTROLLED_PROVIDER_MODE;
  t.after(() => { for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]; Object.assign(process.env, previous); });
  t.mock.method(mongoose, 'connect', () => { throw Error('REAL_DATABASE_FORBIDDEN'); });
  t.mock.method(globalThis, 'fetch', () => { throw Error('REAL_PROVIDER_FORBIDDEN'); });
  t.mock.method(console, 'error', () => {});
  // Exercise the actual durable key/CAS implementation, replacing ONLY storage.
  const rows = new Map<string, any>(); const quota = new Map<string, number>();
  t.mock.method(TranslationAttempt, 'aggregate', async (pipeline: any) => { const row = rows.get(pipeline[0].$match._id); return row ? [{ row }] : []; });
  t.mock.method(TranslationAttempt.collection, 'insertOne', async (value: any, options: any) => {
    assert.deepEqual(options.writeConcern, { w: 'majority', j: true });
    if (rows.has(value._id)) throw { code: 11000 }; rows.set(value._id, structuredClone(value)); return {} as any;
  });
  t.mock.method(TranslationAttempt.db, 'startSession', async () => ({ withTransaction: async (work: () => Promise<void>) => work(), endSession: async () => {} }) as any);
  t.mock.method(TranslationAttempt.collection, 'findOne', async (filter: any) => rows.get(filter._id) ?? null);
  t.mock.method(TranslationAttempt.collection, 'updateOne', async (filter: any, update: any) => {
    if (update.$set?.quotaReserved) { Object.assign(rows.get(filter._id), update.$set); return { modifiedCount: 1 } as any; }
    quota.set(filter._id, (quota.get(filter._id) ?? 0) + 1); return { modifiedCount: 1, upsertedCount: 0 } as any;
  });
  t.mock.method(TranslationAttempt, 'updateOne', async (filter: any, update: any) => {
    const row = rows.get(filter._id);
    if (!row || Object.entries(filter).some(([key, value]) => row[key] !== value)) return { matchedCount: 0, modifiedCount: 0 } as any;
    Object.assign(row, update.$set, { updatedAt: new Date() }); return { matchedCount: 1, modifiedCount: 1 } as any;
  });
  return { rows, quota };
}

for (const scenario of ['same-video', 'same-transcript', 'same-filename-different-content', 'same-hash-different-project']) test(`${scenario}: separate project attempts and RAM drafts, completed A cannot poison B`, async t => {
  const { rows } = fixture(t); const owner = new Types.ObjectId().toString();
  const projects = [0, 1].map(i => ({ _id: new Types.ObjectId(), userId: owner, name: `Project ${i}`, sourceLanguage: 'vi', status: 'TRANSCRIBED',
    filename: 'same-video.mp4', mediaHash: hash(['same-filename-different-content', 'same-transcript'].includes(scenario) ? `media-${i}` : 'identical media'), text: scenario === 'same-filename-different-content' ? `Synthetic sentence ${i}.` : 'Identical synthetic sentence.' }));
  const transcripts = projects.map(p => ({ _id: new Types.ObjectId(), projectId: p._id, status: 'READY', revision: 1, languageCode: 'vi', fullText: p.text }));
  const segments = transcripts.map(tr => ({ _id: new Types.ObjectId(), transcriptId: tr._id, sequence: 1, text: tr.fullText, startTime: 0, endTime: 1 }));
  t.mock.method(Media, 'findOne', () => { throw Error('Translation must not deduplicate by filename/media hash'); });
  t.mock.method(Project, 'findOne', (f: any) => query(projects.find(p => String(p._id) === String(f._id) && f.userId === owner) ?? null));
  t.mock.method(Transcript, 'aggregate', (pipeline: any) => query(transcripts.filter(tr => String(tr.projectId) === String(pipeline[0].$match.projectId))) as any);
  t.mock.method(Transcript, 'findOne', (f: any) => query(transcripts.find(tr => String(tr._id) === String(f._id))));
  t.mock.method(TranscriptSegment, 'aggregate', (pipeline: any) => ({ session() { return this; }, cursor: () => ({ async *[Symbol.asyncIterator]() { yield* segments.filter(s => String(s.transcriptId) === String(pipeline[0].$match.transcriptId)); }, async close() {} }) }) as any);
  t.mock.method(Language, 'exists', () => query({})); t.mock.method(Translation, 'exists', () => query(null)); t.mock.method(ProcessingJob, 'exists', () => query(null));
  const inputs: string[] = [];
  const service = new GroupTranslationService({ async translate(input) {
    await customerDispatch('METADATA'); await customerResponse('METADATA'); await customerDispatch('GENERATION');
    inputs.push(input.fullText); await customerResponse('GENERATION');
    return input.groups.map(g => ({ groupId: g.groupId, translatedText: 'Validated synthetic English.' }));
  } }, new GroupDraftStore());
  const a = await service.customerGenerate(String(projects[0]!._id), owner);
  assert.equal((await service.customerGenerate(String(projects[0]!._id), owner)).draftId, a.draftId); assert.equal(inputs.length, 1);
  projects[0]!.status = 'COMPLETED';
  const b = await service.customerGenerate(String(projects[1]!._id), owner);
  assert.notEqual(a.draftId, b.draftId); assert.equal(b.projectId, String(projects[1]!._id));
  assert.equal(inputs.length, 2); assert.equal(rows.size, 2);
  const records = [...rows.values()]; assert.notEqual(records[0]._id, records[1]._id);
  assert.equal(records[0].projectId, String(projects[0]!._id)); assert.equal(records[1].projectId, String(projects[1]!._id));
  assert.equal(records.every(r => r.state === 'DRAFT'), true);
  assert.equal(projects[0]!.status, 'COMPLETED');
  if (scenario === 'same-filename-different-content') { assert.notEqual(projects[0]!.mediaHash, projects[1]!.mediaHash); assert.notEqual(inputs[0], inputs[1]); }
  else {
    if (scenario === 'same-transcript') assert.notEqual(projects[0]!.mediaHash, projects[1]!.mediaHash);
    else assert.equal(projects[0]!.mediaHash, projects[1]!.mediaHash);
    assert.equal(inputs[0], inputs[1]);
  }
  assert.equal((await service.customerGenerate(String(projects[1]!._id), owner)).draftId, b.draftId); assert.equal(inputs.length, 2);
});

test('identical source fingerprint still yields distinct native durable keys; B504 remains fenced after restart while A/C survive', async t => {
  const { rows } = fixture(t); const ownerId = new Types.ObjectId().toString();
  const scopes = [0, 1, 2].map(() => ({ ownerId, projectId: new Types.ObjectId().toString(), targetLanguage: 'en', sourceRevision: hash('EXACTLY SAME SOURCE SNAPSHOT') }));
  const calls = new Map<string, number>();
  const run = (scope: typeof scopes[number]) => new CustomerAttemptStore().execute(scope, hash('same approved config'), async () => {
    await customerDispatch('METADATA'); await customerResponse('METADATA'); await customerDispatch('GENERATION');
    calls.set(scope.projectId, (calls.get(scope.projectId) ?? 0) + 1);
    if (scope === scopes[1]) throw new TranslationProviderFailure(502, 'TRANSLATION_TIMEOUT', 'Safe HTTP504', 504);
    await customerResponse('GENERATION');
    return { ...scope, draftId: new Types.ObjectId().toString(), transcriptId: new Types.ObjectId().toString(), transcriptRevision: 1, sourceLanguage: 'vi', groupingVersion: 'phrase-candidates-v1', groups: [], outputDigest: hash('validated mock output'), expiresAt: new Date(Date.now() + 60000).toISOString(), alignmentFormat: 'GROUPS_V1', state: 'DRAFT' } as GroupDraft;
  });
  const a = await run(scopes[0]!); await assert.rejects(run(scopes[1]!)); const c = await run(scopes[2]!);
  assert.equal(rows.size, 3); assert.equal(new Set([...rows.keys()]).size, 3);
  const b = [...rows.values()].find(r => r.projectId === scopes[1]!.projectId);
  assert.equal(b.state, 'UNCERTAIN'); assert.equal(b.phase, 'GENERATION_DISPATCHING'); assert.equal(b.providerHttpStatus, 504); assert.equal(b.draftJson, undefined);
  const snapshot = JSON.stringify(b);
  for (let i = 0; i < 3; i++) await assert.rejects(run(scopes[1]!), (error: any) => error.code === 'TRANSLATION_ATTEMPT_UNCERTAIN');
  assert.equal(JSON.stringify(b), snapshot); assert.equal(calls.get(scopes[1]!.projectId), 1);
  assert.equal((await run(scopes[0]!)).draftId, a.draftId); assert.equal((await run(scopes[2]!)).draftId, c.draftId);
  assert.deepEqual([...calls.values()], [1, 1, 1]);
});

test('installed SDK sends the configured120s server deadline, not a media hash/name cache key; HTTP504 never retries', async t => {
  fixture(t); process.env.GEMINI_API_KEY = 'synthetic-only'; process.env.TRANSLATION_PROVIDER = 'gemini';
  let gets = 0, posts = 0;
  const input = { fullText: 'Identical synthetic sentence.', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: 'synthetic-group', sourceText: 'Identical synthetic sentence.' }] };
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const endpoint = new URL(String(url));
    assert.equal(endpoint.origin, 'https://generativelanguage.googleapis.com');
    assert.equal(new Headers(init?.headers).get('X-Server-Timeout'), '120');
    if (init?.method !== 'POST') { gets++; return Response.json({ supportedGenerationMethods: ['generateContent'] }); }
    posts++; assert.equal(endpoint.pathname, '/v1beta/models/gemini-3.8-flash:generateContent');
    assert.deepEqual(JSON.parse(JSON.parse(String(init.body)).contents[0].parts[0].text), input);
    return Response.json({ error: { code: 504, status: 'DEADLINE_EXCEEDED', message: 'Synthetic only' } }, { status: 504 });
  });
  await assert.rejects(withCustomerTranslation(() => new GeminiGroupTranslationProvider().translate(input)), (error: any) => error.code === 'TRANSLATION_TIMEOUT' && error.httpStatus === 504);
  assert.equal(gets, 1); assert.equal(posts, 1);
});
