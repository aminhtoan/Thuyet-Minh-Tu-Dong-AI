import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { Types } from 'mongoose';
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/mocked-only';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d';
process.env.GROUP_TRANSLATION_ENABLED = 'false';
const { readOnlyTranslationDiagnostic, measureDiagnosticSource } = await import('../src/services/translation/read-only-diagnostic.js');
const { controlledTarget: target } = await import('./controlled-execution/fixtures.js');
const { groupDraftStore } = await import('../src/services/translation/group-draft-store.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js');
const { Translation } = await import('../src/models/Translation.js');
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { Project } = await import('../src/models/Project.js');
const { User } = await import('../src/models/User.js');
const { AppError } = await import('../src/utils/app-error.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const { projectRouter } = await import('../src/routes/project.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { default: express } = await import('express');
const { digest } = await import('../src/services/translation/group-plan.js');
const source = { transcriptId: 'a'.repeat(24), transcriptRevision: 1, languageCode: 'vi', fullText: 'Synthetic only', segments: [{ id: 'b'.repeat(24), sequence: 1, text: 'Synthetic only', startTime: 0, endTime: 1 }] };
const deps = (patch = {}) => ({ measure: async () => ({ bytes: Buffer.byteLength(JSON.stringify(source)), segments: 1, revision: 1, reason: null }), load: async () => source, english: async () => null, jobs: async () => null, drafts: () => ({ visibility: 'PROCESS_LOCAL_ONLY', count: 0, globalAbsence: 'UNKNOWN' }), ...patch }) as any;

test('source over cap reports exact numeric measurement without loading or creating artifacts', async () => {
  let loaded = 0;
  const result = await readOnlyTranslationDiagnostic(target.projectId, deps({ measure: async () => ({ bytes: 105958, segments: 1027, revision: 1, reason: 'BLOCKED_SOURCE_CAP' }), load: async () => { loaded++; throw new Error(); } }));
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.reasonCode, 'BLOCKED_SOURCE_CAP');
  assert.equal(result.sourceBytes, 105958); assert.equal(result.sourceCapBytes, 98304); assert.equal(result.transcript, 'UNKNOWN'); assert.equal(loaded, 0);
  assert.equal(process.env.GROUP_TRANSLATION_ENABLED, 'false');
});
test('revision drift, missing CURRENT source and unknown failures return only safe codes', async () => {
  for (const code of ['SOURCE_NOT_CURRENT', 'SOURCE_REVISION_MISMATCH']) {
    const result = await readOnlyTranslationDiagnostic(target.projectId, deps({ measure: async () => { throw new AppError(409, code, 'PRIVATE'); } }));
    assert.equal(result.reasonCode, code); assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  }
  const result = await readOnlyTranslationDiagnostic(target.projectId, deps({ load: async () => ({ ...source, transcriptRevision: 2 }) }));
  assert.equal(result.reasonCode, 'SOURCE_REVISION_MISMATCH');
});
test('new short source has current canonical digest and ordered groups without museum-specific assumptions', async () => {
  const result = await readOnlyTranslationDiagnostic(target.projectId, deps());
  assert.equal(result.transcript, 'PASS'); assert.equal(result.groups, 'PASS'); assert.equal(result.reasonCode, 'GROUP_TRANSLATION_DISABLED');
  assert.equal(result.generationAuthorized, false); assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.sourceDigest, digest(source));
  assert.ok(!JSON.stringify(result).includes('Synthetic only'));
});
test('persisted English, active jobs and local drafts are independently reported even when cap blocks source', async () => {
  const result = await readOnlyTranslationDiagnostic(target.projectId, deps({ english: async () => ({ _id: 1 }), jobs: async () => ({ _id: 2 }), drafts: () => ({ visibility: 'PROCESS_LOCAL_ONLY', count: 1, globalAbsence: 'UNKNOWN' }), measure: async () => ({ bytes: 105958, segments: 1027, revision: 1, reason: 'BLOCKED_SOURCE_CAP' }) }));
  assert.equal(result.persistedEnglish, 'BLOCKED'); assert.equal(result.activeEnglishJobs, 'BLOCKED'); assert.equal(result.drafts.count, 1); assert.equal(result.drafts.globalAbsence, 'UNKNOWN');
});
test('draft observation is process local, read-only and exposes no identifiers or text', () => {
  assert.deepEqual(groupDraftStore.inspectConflicts(target.projectId, 'en'), { visibility: 'PROCESS_LOCAL_ONLY', count: 0, globalAbsence: 'UNKNOWN' });
});
test('bounded measurement counts exact JSON UTF-8 bytes with Unicode and escaping; closes cursor', async t => {
  const header = { _id: new Types.ObjectId(source.transcriptId), revision: 1, status: 'READY', languageCode: 'vi', fullText: 'Tiếng Việt "\\\n' };
  const row = { _id: new Types.ObjectId(source.segments[0]!.id), sequence: 1, text: header.fullText, startTime: 0, endTime: 1 };
  let closed = 0;
  t.mock.method(Transcript, 'aggregate', () => Promise.resolve([header]) as any);
  t.mock.method(Transcript, 'findOne', () => ({ select: async () => ({ revision: 1 }) }) as any);
  t.mock.method(TranscriptSegment, 'aggregate', () => ({ cursor: (options: any) => { assert.equal(options.batchSize, 1); return { async *[Symbol.asyncIterator]() { yield row; }, close: async () => { closed++; } }; } }) as any);
  const result = await measureDiagnosticSource(target.projectId);
  assert.equal(result.bytes, Buffer.byteLength(JSON.stringify({ ...source, fullText: header.fullText, segments: [{ ...source.segments[0], text: row.text }] })));
  assert.equal(result.reason, null); assert.equal(closed, 1);
});
test('measurement never collects truncated source and closes cursor on revision drift or segment overflow', async t => {
  t.mock.method(Transcript, 'aggregate', () => Promise.resolve([{ _id: source.transcriptId, revision: 1, status: 'READY', languageCode: 'vi', fullText: 'x' }]) as any);
  let changed = false, closed = 0;
  t.mock.method(Transcript, 'findOne', () => ({ select: async () => ({ revision: changed ? 2 : 1 }) }) as any);
  t.mock.method(TranscriptSegment, 'aggregate', () => ({ cursor: () => ({ async *[Symbol.asyncIterator]() { for (let i = 0; i < 10001; i++) yield { _id: source.segments[0]!.id, sequence: i + 1, text: 'x', startTime: i, endTime: i + 1 }; }, close: async () => { closed++; } }) }) as any);
  const result = await measureDiagnosticSource(target.projectId); assert.equal(result.bytes, null); assert.equal(result.reason, 'BLOCKED_SOURCE_CAP');
  changed = true; await assert.rejects(measureDiagnosticSource(target.projectId), (e: any) => e.code === 'SOURCE_REVISION_MISMATCH'); assert.equal(closed, 2);
});
test('exact source byte boundary accepts 98304 for verification, rejects 98305 without raising policy', async t => {
  const empty = { ...source, fullText: '', segments: [{ ...source.segments[0], text: 'x' }] };
  const padding = 98304 - Buffer.byteLength(JSON.stringify(empty));
  let extra = 0;
  t.mock.method(Transcript, 'aggregate', () => Promise.resolve([{ _id: source.transcriptId, revision: 1, status: 'READY', languageCode: 'vi', fullText: 'x'.repeat(padding + extra) }]) as any);
  t.mock.method(Transcript, 'findOne', () => ({ select: async () => ({ revision: 1 }) }) as any);
  t.mock.method(TranscriptSegment, 'aggregate', () => ({ cursor: () => ({ async *[Symbol.asyncIterator]() { yield { _id: source.segments[0]!.id, sequence: 1, text: 'x', startTime: 0, endTime: 1 }; }, close: async () => {} }) }) as any);
  const at = await measureDiagnosticSource(target.projectId); assert.equal(at.bytes, 98304); assert.equal(at.reason, null);
  extra = 1; const above = await measureDiagnosticSource(target.projectId); assert.equal(above.bytes, 98305); assert.equal(above.reason, 'BLOCKED_SOURCE_CAP');
});
test('real HTTP JWT/RBAC/ownership/scope/dev guards; only read queries, no provider calls', async t => {
  const owner = '1'.repeat(24), other = '2'.repeat(24), admin = '3'.repeat(24); let reads = 0;
  t.mock.method(User, 'findOne', async (f: any) => { assert.equal(f.deletedAt, null); return new User({ _id: f._id, fullName: 'Synthetic', email: 'test@example.invalid', role: f._id === admin ? 'ADMIN' : 'CUSTOMER', status: 'ACTIVE' }); });
  t.mock.method(Project, 'findOne', (f: any) => ({ select: async () => f.userId === owner && f._id !== 'f'.repeat(24) ? { _id: new Types.ObjectId(f._id) } : null }) as any);
  t.mock.method(Translation, 'exists', async () => { reads++; return null; });
  t.mock.method(ProcessingJob, 'exists', async () => null);
  t.mock.method(Transcript, 'aggregate', () => Promise.resolve([{ _id: source.transcriptId, revision: 1, status: 'READY', languageCode: 'vi', fullText: null }]) as any);
  for (const model of [Project, Transcript, TranscriptSegment, Translation, ProcessingJob]) {
    t.mock.method(model, 'create', () => { throw new Error('WRITE_FORBIDDEN'); });
    t.mock.method(model, 'updateOne', () => { throw new Error('WRITE_FORBIDDEN'); });
  }
  const nativeFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', () => { throw new Error('PROVIDER_FORBIDDEN'); });
  const app = express(); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/projects/${target.projectId}/translations/read-only-diagnostic`;
  const get = (id?: string, path = url) => nativeFetch(path, { headers: id ? { Authorization: `Bearer ${signAccessToken(id, id === admin ? 'ADMIN' : 'CUSTOMER')}` } : {} });
  try {
    assert.equal((await get()).status, 401); assert.equal((await get(admin)).status, 403); assert.equal((await get(other)).status, 404);
    assert.equal((await get(owner, url.replace(target.projectId, 'f'.repeat(24)))).status, 404);
    process.env.NODE_ENV = 'production'; assert.equal((await get(owner)).status, 404); process.env.NODE_ENV = 'development';
    assert.equal(reads, 0);
    const response = await get(owner); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json(); assert.equal(body.data.reasonCode, 'BLOCKED_SOURCE_CAP'); assert.equal(reads, 1); assert.equal(process.env.GROUP_TRANSLATION_ENABLED, 'false');
    const another = url.replace(target.projectId, '4'.repeat(24));
    assert.equal((await get(owner, another)).status, 200);
    assert.equal((await get(other, another)).status, 404);
  } finally { process.env.NODE_ENV = 'development'; await new Promise<void>(resolve => server.close(() => resolve())); }
});
