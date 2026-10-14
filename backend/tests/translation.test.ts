import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { after, before, mock } from 'node:test';
import type { Server } from 'node:http';
import type { TranslationProvider } from '../src/services/translation/translation-provider.interface.js';

process.env.NODE_ENV = 'test';
const suffix = randomUUID();
const password = 'SecurePass123';
const ownerEmail = `s21-test-owner-${suffix}@example.com`;
const otherEmail = `s21-test-other-${suffix}@example.com`;

const { app } = await import('../src/app.js');
const { env } = await import('../src/config/env.js');
const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
const { User } = await import('../src/models/User.js');
const { Project } = await import('../src/models/Project.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js');
const { Translation } = await import('../src/models/Translation.js');
const { TranslationSegment } = await import('../src/models/TranslationSegment.js');
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { AuthSession } = await import('../src/models/AuthSession.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const { Language } = await import('../src/models/Language.js');
const { hashPassword } = await import('../src/utils/password.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const { setTranslationProviderForTests } = await import('../src/services/translation/translation.service.js');
const { OpenAiTranslationProvider, OpenAiTranslationError } = await import('../src/services/translation/openai-translation.provider.js');

let server: Server; let base = ''; let token = ''; let otherToken = ''; let adminToken = ''; let ownerId = ''; let otherId = '';
const projectIds: string[] = [];
const call = async (path: string, method = 'GET', auth?: string, body?: unknown) => {
  const response = await fetch(base + path, { method, headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) as any : null };
};
const makeProject = async (userId: string, status = 'TRANSCRIBED', withTranscript = true) => {
  const project = await Project.create({ userId, name: `S21 ${suffix}`, sourceLanguage: 'vi', status, progress: 100 }); projectIds.push(project._id.toString());
  if (withTranscript) {
    const transcript = await Transcript.create({ projectId: project._id, languageCode: 'vi', fullText: 'Xin chào. Đây là thử nghiệm.', status: 'READY' });
    await TranscriptSegment.insertMany([
      { transcriptId: transcript._id, sequence: 1, startTime: 0, endTime: 1.5, text: 'Xin chào.' },
      { transcriptId: transcript._id, sequence: 2, startTime: 1.5, endTime: 4.2, text: 'Đây là thử nghiệm.' },
    ]);
  }
  return project;
};
const providerFor = (prefix: string): TranslationProvider => ({ async translate(input) { return { ...input, segments: input.segments.map((segment) => ({ index: segment.index, text: `${prefix} ${segment.index}` })) }; } });

before(async () => {
  // Catalog fixture only: do not add/update real Language records for these tests.
  mock.method(Language, 'exists', async (filter: { code: string }) => ['en', 'ja', 'de'].includes(filter.code) ? { _id: 'test-catalog' } : null);
  await connectDatabase(env.mongoUri);
  server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('port'); base = `http://127.0.0.1:${address.port}`;
  const register = (email: string) => call('/api/auth/register', 'POST', undefined, { fullName: 'S21', email, password });
  let response = await register(ownerEmail); token = response.body.data.accessToken; ownerId = response.body.data.user.id;
  response = await register(otherEmail); otherToken = response.body.data.accessToken; otherId = response.body.data.user.id;
  const admin = await User.create({ fullName: 'Admin', email: `s21-test-admin-${suffix}@example.com`, passwordHash: await hashPassword(password), role: 'ADMIN', status: 'ACTIVE' });
  adminToken = signAccessToken(admin._id.toString(), 'ADMIN');
  await ProcessingJob.syncIndexes();
});

after(async () => {
  mock.restoreAll();
  setTranslationProviderForTests();
  const users = await User.find({ email: { $regex: `s21-test-.*-${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@example.com` } });
  const transcripts = await Transcript.find({ projectId: { $in: projectIds } });
  const translations = await Translation.find({ projectId: { $in: projectIds } });
  await Promise.all([
    TranslationSegment.deleteMany({ translationId: { $in: translations.map((item) => item._id) } }), Translation.deleteMany({ projectId: { $in: projectIds } }),
    TranscriptSegment.deleteMany({ transcriptId: { $in: transcripts.map((item) => item._id) } }), Transcript.deleteMany({ projectId: { $in: projectIds } }),
    ProcessingJob.deleteMany({ projectId: { $in: projectIds } }), Project.deleteMany({ _id: { $in: projectIds } }),
    AuthSession.deleteMany({ userId: { $in: users.map((item) => item._id) } }), ActivityLog.deleteMany({ userId: { $in: users.map((item) => item._id) } }),
  ]);
  await User.deleteMany({ _id: { $in: users.map((item) => item._id) } });
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await disconnectDatabase();
});

test('S21 translation integration', async (t) => {
  await t.test('JWT, CUSTOMER role, validation and ownership are enforced', async () => {
    const project = await makeProject(ownerId);
    assert.equal((await call(`/api/projects/${project._id}/translations`, 'POST', undefined, { targetLanguage: 'en' })).status, 401);
    assert.equal((await call(`/api/projects/${project._id}/translations`, 'POST', adminToken, { targetLanguage: 'en' })).status, 403);
    assert.equal((await call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'english' })).status, 400);
    assert.equal((await call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'en', userId: otherId })).status, 400);
    const foreign = await makeProject(otherId);
    assert.equal((await call(`/api/projects/${foreign._id}/translations`, 'GET', token)).body.error.code, 'PROJECT_NOT_FOUND');
    assert.equal((await call(`/api/projects/${foreign._id}/translations/en`, 'GET', token)).body.error.code, 'PROJECT_NOT_FOUND');
    assert.notEqual(token, otherToken);
  });

  await t.test('source, state and target requirements are enforced', async () => {
    const noTranscript = await makeProject(ownerId, 'TRANSCRIBED', false);
    assert.equal((await call(`/api/projects/${noTranscript._id}/translations`, 'POST', token, { targetLanguage: 'en' })).body.error.code, 'TRANSCRIPT_NOT_FOUND');
    const draft = await makeProject(ownerId, 'DRAFT');
    assert.equal((await call(`/api/projects/${draft._id}/translations`, 'POST', token, { targetLanguage: 'en' })).body.error.code, 'INVALID_PROJECT_STATE');
    const same = await makeProject(ownerId);
    assert.equal((await call(`/api/projects/${same._id}/translations`, 'POST', token, { targetLanguage: 'vi' })).body.error.code, 'SAME_SOURCE_TARGET_LANGUAGE');
  });

  await t.test('success persists aligned ordered segments, full text and completed job', async () => {
    const project = await makeProject(ownerId); let received: any;
    setTranslationProviderForTests({ async translate(input) { received = input; return { ...input, segments: [{ index: 1, text: 'This is a test.' }, { index: 0, text: 'Hello.' }] }; } });
    const response = await call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'en' });
    assert.equal(response.status, 200); assert.deepEqual(received.segments.map((segment: any) => segment.index), [0, 1]);
    assert.equal(response.body.data.translation.fullText, 'Hello. This is a test.');
    assert.deepEqual(response.body.data.translation.segments.map((segment: any) => [segment.index, segment.text]), [[0, 'Hello.'], [1, 'This is a test.']]);
    assert.equal((await Project.findById(project._id))?.status, 'TRANSLATED');
    const job = await ProcessingJob.findOne({ projectId: project._id, type: 'TRANSLATION' }); assert.equal(job?.status, 'COMPLETED'); assert.equal(job?.targetLanguage, 'en');
  });

  await t.test('GET list/detail, multiple languages and same-target idempotency work', async () => {
    const project = await makeProject(ownerId); let calls = 0;
    setTranslationProviderForTests({ async translate(input) { calls++; return providerFor(input.targetLanguage).translate(input); } });
    assert.equal((await call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'en' })).status, 200);
    assert.equal((await call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'ja' })).status, 200);
    const again = await call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'en' }); assert.equal(again.body.data.idempotent, true); assert.equal(calls, 2);
    const list = await call(`/api/projects/${project._id}/translations`, 'GET', token); assert.deepEqual(list.body.data.translations.map((item: any) => item.targetLanguage), ['en', 'ja']);
    const detail = await call(`/api/projects/${project._id}/translations/ja`, 'GET', token); assert.deepEqual(detail.body.data.translation.segments.map((item: any) => item.index), [0, 1]);
    assert.equal((await call(`/api/projects/${project._id}/translations/fr`, 'GET', token)).body.error.code, 'TRANSLATION_NOT_FOUND');
  });

  await t.test('near-simultaneous same-target requests make one provider call', async () => {
    const project = await makeProject(ownerId); let calls = 0; let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
    setTranslationProviderForTests({ async translate(input) { calls++; await gate; return providerFor('EN').translate(input); } });
    const first = call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'en' });
    while (calls === 0) await new Promise((resolve) => setTimeout(resolve, 10));
    const duplicate = await call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'en' }); release(); const success = await first;
    assert.equal(success.status, 200); assert.equal(duplicate.status, 409); assert.equal(duplicate.body.error.code, 'TRANSLATION_ALREADY_RUNNING'); assert.equal(calls, 1);
  });

  await t.test('provider failure is sanitized and retry preserves job history', async () => {
    const project = await makeProject(ownerId); setTranslationProviderForTests({ async translate() { throw new Error('secret-provider-detail'); } });
    let response = await call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'de' });
    assert.equal(response.status, 502); assert.equal(response.body.error.code, 'TRANSLATION_PROVIDER_ERROR'); assert.equal(JSON.stringify(response.body).includes('secret-provider-detail'), false);
    assert.equal((await Project.findById(project._id))?.status, 'FAILED');
    setTranslationProviderForTests(providerFor('DE')); response = await call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'de' }); assert.equal(response.status, 200);
    assert.equal(await ProcessingJob.countDocuments({ projectId: project._id, type: 'TRANSLATION' }), 2); assert.equal(await Translation.countDocuments({ projectId: project._id, targetLanguage: 'de' }), 1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const logs = await ActivityLog.find({ entityId: project._id, action: /^TRANSLATION_/ });
    assert.ok(logs.some((log) => log.action === 'TRANSLATION_FAILED')); assert.ok(logs.some((log) => log.action === 'TRANSLATION_RETRIED')); assert.ok(logs.some((log) => log.action === 'TRANSLATION_COMPLETED'));
    assert.equal(logs.some((log) => /secret-provider-detail|Xin chào|DE 0/i.test(log.description)), false);
  });

  await t.test('malformed provider segment output is rejected before persistence', async () => {
    for (const segments of [[{ index: 0, text: 'Only one' }], [{ index: 0, text: 'A' }, { index: 0, text: 'B' }], [{ index: 0, text: 'A' }, { index: 2, text: 'B' }], [{ index: 0, text: 'A' }, { index: 1, text: ' ' }]]) {
      const project = await makeProject(ownerId); setTranslationProviderForTests({ async translate(input) { return { ...input, segments }; } });
      const response = await call(`/api/projects/${project._id}/translations`, 'POST', token, { targetLanguage: 'fr' }); assert.equal(response.body.error.code, 'TRANSLATION_INVALID_RESPONSE');
      assert.equal(await Translation.countDocuments({ projectId: project._id }), 0);
    }
  });

  await t.test('OpenAI adapter uses structured output and safe diagnostics without a real request', async () => {
    const originalFetch = globalThis.fetch; const oldKey = process.env.OPENAI_API_KEY; const oldModel = process.env.TRANSLATION_MODEL;
    process.env.OPENAI_API_KEY = 'test-only-key'; process.env.TRANSLATION_MODEL = 'gpt-4o-mini'; let requestBody = '';
    globalThis.fetch = async (_input, init) => { requestBody = String(init?.body); return new Response(JSON.stringify({ error: { type: 'invalid_request_error', code: 'bad_input', message: 'Rejected Bearer abc sk-testsecret' } }), { status: 400, headers: { 'x-request-id': 'req_safe_s21' } }); };
    try {
      await assert.rejects(new OpenAiTranslationProvider().translate({ sourceLanguage: 'vi', targetLanguage: 'en', segments: [{ index: 0, text: 'Xin chào' }] }), (error: unknown) => {
        assert.ok(error instanceof OpenAiTranslationError); assert.equal(error.diagnostics.message, 'Rejected Bearer [REDACTED] [REDACTED]'); assert.equal(error.diagnostics.requestId, 'req_safe_s21'); return true;
      });
      assert.equal(requestBody.includes('json_schema'), true); assert.equal(requestBody.includes('test-only-key'), false);
    } finally { globalThis.fetch = originalFetch; if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; if (oldModel === undefined) delete process.env.TRANSLATION_MODEL; else process.env.TRANSLATION_MODEL = oldModel; }
  });
});
