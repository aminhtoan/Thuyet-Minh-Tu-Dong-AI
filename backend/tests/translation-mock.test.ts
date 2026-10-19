import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import mongoose, { Types } from 'mongoose';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/translation_mock_only';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex'); process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '7d';
const { default: express } = await import('express');
const { projectRouter } = await import('../src/routes/project.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { User } = await import('../src/models/User.js');
const { Project } = await import('../src/models/Project.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js');
const { Translation } = await import('../src/models/Translation.js');
const { TranslationSegment } = await import('../src/models/TranslationSegment.js');
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const { Language } = await import('../src/models/Language.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const { setTranslationProviderForTests } = await import('../src/services/translation/translation.service.js');

test('real JWT/ownership routes + translation service, all persistence mocked', async t => {
  const owner = new Types.ObjectId(), other = new Types.ObjectId(), projectId = new Types.ObjectId(), transcriptId = new Types.ObjectId();
  const user = { _id: owner, fullName: 'Mock test', email: 'mock@example.test', role: 'CUSTOMER', status: 'ACTIVE' };
  const project = { _id: projectId, userId: owner, sourceLanguage: 'vi', status: 'TRANSCRIBED' };
  const transcript = { _id: transcriptId, languageCode: 'vi', fullText: 'Nguyễn Hữu Huân, 12 Long Châu' };
  (transcript as typeof transcript & { revision: number }).revision = 1;
  const sources = [{ _id: new Types.ObjectId(), sequence: 1, startTime: .12, endTime: 1.2, text: 'Nguyễn Hữu Huân' }, { _id: new Types.ObjectId(), sequence: 2, startTime: 1.2, endTime: 3.45, text: '12 Long Châu' }];
  let saved: any = null, savedSegments: any[] = [], missing = false, generated = 0, writes = 0, jobs = 0;
  let deletedUser = false;
  t.mock.method(User, 'findOne', async (filter: any) => {
    assert.equal(filter.deletedAt, null);
    return deletedUser ? null : filter._id === owner.toString() ? user : { ...user, _id: other };
  });
  t.mock.method(Language, 'exists', async (filter: any) => filter.code === 'en' ? { _id: new Types.ObjectId() } : null);
  const query = (value: any) => ({ sort() { return this; }, select() { return this; }, session() { return this; }, then(resolve: any, reject: any) { return Promise.resolve(value).then(resolve, reject); } });
  t.mock.method(Project, 'findOne', (filter: any) => query(filter._id === projectId.toString() && filter.userId === owner.toString() ? project : null));
  t.mock.method(Project, 'findOneAndUpdate', async () => ({ ...project }));
  t.mock.method(Project, 'updateOne', async () => ({}));
  t.mock.method(Transcript, 'findOne', async () => missing ? null : transcript);
  t.mock.method(Transcript, 'updateOne', async (filter: any) => ({ matchedCount: filter.revision === transcript.revision ? 1 : 0 }));
  t.mock.method(TranscriptSegment, 'find', () => query(sources));
  t.mock.method(Translation, 'findOne', async () => saved);
  t.mock.method(Translation, 'findOneAndUpdate', async (_filter: any, update: any) => { writes++; saved = { ...(saved ?? {}), ...(update.$set ?? update), _id: saved?._id ?? new Types.ObjectId(), createdAt: saved?.createdAt ?? new Date(), updatedAt: new Date() }; return saved; });
  t.mock.method(Translation, 'create', async (rows: any[]) => { writes++; saved = { ...rows[0], _id: new Types.ObjectId(), createdAt: new Date(), updatedAt: new Date() }; return [saved]; });
  t.mock.method(TranslationSegment, 'find', async () => savedSegments);
  t.mock.method(TranslationSegment, 'countDocuments', async () => savedSegments.length);
  t.mock.method(TranslationSegment, 'deleteMany', async () => { savedSegments = []; });
  t.mock.method(TranslationSegment, 'insertMany', async (rows: any[]) => { savedSegments = rows; });
  t.mock.method(ProcessingJob, 'create', async () => { jobs++; return { _id: new Types.ObjectId() }; });
  t.mock.method(ProcessingJob, 'updateOne', async () => ({ matchedCount: 1 }));
  t.mock.method(ActivityLog, 'create', async () => ({}));
  t.mock.method(mongoose, 'startSession', async () => ({ async withTransaction(action: () => Promise<void>) { await action(); }, async endSession() {} }));
  const provider = { async translate(input: any) { generated++; return { ...input, segments: input.segments.map((segment: any) => ({ index: segment.index, text: segment.text })) }; } };
  setTranslationProviderForTests(provider);
  const app = express(); app.use(express.json()); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const token = signAccessToken(owner.toString(), 'CUSTOMER'), otherToken = signAccessToken(other.toString(), 'CUSTOMER');
  const call = async (method = 'POST', auth: string | null = token, body: unknown = { targetLanguage: 'en' }) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/projects/${projectId}/translations${method === 'GET' ? '/en' : ''}`, { method, headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth}` } : {}) }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    await t.test('unauthenticated/other user/blocked/ADMIN rejected without provider', async () => { assert.equal((await call('POST', null)).status, 401); assert.equal((await call('POST', otherToken)).status, 404); user.status = 'BLOCKED'; assert.equal((await call()).status, 403); user.status = 'ACTIVE'; user.role = 'ADMIN'; assert.equal((await call()).status, 403); user.role = 'CUSTOMER'; assert.equal(generated, 0); });
    await t.test('missing transcript and invalid/unsupported/same target rejected', async () => { missing = true; assert.equal((await call()).status, 404); missing = false; assert.equal((await call('POST', token, { targetLanguage: 'vi' })).status, 400); assert.equal((await call('POST', token, { targetLanguage: 'not valid' })).status, 400); assert.equal((await call('POST', token, { targetLanguage: 'xx' })).body.error.code, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED'); assert.equal(generated, 0); });
    await t.test('unverified word, mixed and phrase sources are blocked before job/write/provider', async () => {
      const before = JSON.stringify(sources), oldProvider = process.env.TRANSLATION_PROVIDER;
      process.env.TRANSLATION_PROVIDER = 'gemini';
      try {
        for (const texts of [['Tiểu', 'học'], ['Tiểu học', 'mới'], ['Xin chào.', 'Đây là bảo tàng.']]) {
          sources[0]!.text = texts[0]!; sources[1]!.text = texts[1]!;
          const result = await call(); assert.equal(result.status, 409); assert.equal(result.body.error.code, 'TRANSLATION_ALIGNMENT_UNVERIFIED');
          assert.equal(generated, 0); assert.equal(jobs, 0); assert.equal(writes, 0); assert.equal(project.status, 'TRANSCRIBED');
        }
        process.env.TRANSLATION_PROVIDER = 'openai';
        assert.equal((await call()).body.error.code, 'TRANSLATION_ALIGNMENT_UNVERIFIED');
        assert.equal((await call('POST', token, { targetLanguage: 'en', alignmentVerified: true })).status, 400);
        deletedUser = true; assert.equal((await call()).status, 401); deletedUser = false;
      }
      finally { Object.assign(sources[0]!, JSON.parse(before)[0]); Object.assign(sources[1]!, JSON.parse(before)[1]); if (oldProvider === undefined) delete process.env.TRANSLATION_PROVIDER; else process.env.TRANSLATION_PROVIDER = oldProvider; }
    });
    await t.test('existing CURRENT provenance and exact mapping remain readable/idempotent without generation', async () => {
      saved = { _id: new Types.ObjectId(), projectId, transcriptId, sourceLanguage: 'vi', targetLanguage: 'en', fullText: 'Existing translation', status: 'READY', revision: 1, sourceTranscriptRevision: 1, createdAt: new Date(), updatedAt: new Date() };
      savedSegments = sources.map(source => ({ transcriptSegmentId: source._id, translatedText: 'Existing text' }));
      assert.equal((await call('GET')).status, 200);
      assert.equal((await call()).body.data.idempotent, true);
      assert.equal(writes, 0); assert.equal(generated, 0);
    });
    await t.test('stale or UNKNOWN provenance cannot authorize replacement; old data preserved', async () => {
      for (const sourceRevision of [undefined, 0]) {
        saved.sourceTranscriptRevision = sourceRevision;
        const before = JSON.stringify(saved);
        assert.equal((await call('GET')).status, 409);
        assert.equal((await call()).body.error.code, 'TRANSLATION_ALIGNMENT_UNVERIFIED');
        assert.equal(JSON.stringify(saved), before);
        assert.equal(writes, 0); assert.equal(generated, 0);
      }
    });
  } finally { setTranslationProviderForTests(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
