import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test, { after, before } from 'node:test';
import mongoose, { Types } from 'mongoose';

// Fail closed: no database connection, no real credentials, no provider network.
Object.assign(process.env, { NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1:1/s32_mock_only',
  JWT_ACCESS_SECRET: randomBytes(48).toString('hex'), JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
  JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '1d',
  UPLOAD_DIR: `uploads/s32-source-mock-${randomUUID()}`, GROUP_TRANSLATION_ENABLED: 'true' });
mongoose.set('bufferCommands', false);
const { Project } = await import('../src/models/Project.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js');
const { Media } = await import('../src/models/Media.js');
const { Translation } = await import('../src/models/Translation.js');
const { Narration } = await import('../src/models/Narration.js');
const { Result } = await import('../src/models/Result.js');
const { TranslationAttempt } = await import('../src/models/TranslationAttempt.js');
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const { User } = await import('../src/models/User.js');
const { sourceLanguageState, resolveTranscribedLanguage, assertSourceLanguageConfirmed, SOURCE_LANGUAGES } = await import('../src/services/source-language-contract.js');
const { confirmSourceLanguage, updateProjectSource } = await import('../src/services/source-language.service.js');
const { create, get: getProject } = await import('../src/services/project.service.js');
const { transcribe } = await import('../src/services/transcription.service.js');
const { setSttProviderForTests } = await import('../src/services/stt/stt.service.js');
const { GeminiSttProvider, GeminiSttError, mapGeminiTranscript, geminiTranscriptionConfig } = await import('../src/services/stt/gemini-stt.provider.js');
const { GroupTranslationService, loadSource } = await import('../src/services/translation/group-translation.service.js');
const { customerSimplePreflight } = await import('../src/services/translation/customer-simple-preflight.js');
const { customerAttempts } = await import('../src/services/translation/customer-attempt.js');
const { translate } = await import('../src/services/translation-processing.service.js');
const { createProjectSchema, confirmSourceLanguageSchema } = await import('../src/validators/project.validator.js');
const { uploadRoot } = await import('../src/utils/file.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const { projectRouter } = await import('../src/routes/project.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { default: express } = await import('express');

const ownerId = new Types.ObjectId().toString();
const projectId = new Types.ObjectId().toString();
const transcriptId = new Types.ObjectId();
const query = (value: any): any => ({ select: () => query(value), session: () => query(value), sort: () => query(value), lean: () => query(value),
  then: (done: any, reject: any) => Promise.resolve(value).then(done, reject) });
const code = (expected: string) => (error: any) => error.code === expected;
const auto = () => ({ _id: new Types.ObjectId(projectId), userId: ownerId, name: 'Mock', status: 'TRANSCRIBED', progress: 100,
  sourceLanguageMode: 'AUTO', sourceLanguage: null, sourceLanguageStatus: 'NEEDS_CONFIRMATION', detectedSourceLanguage: null });
const pendingTranscript = () => ({ _id: transcriptId, projectId, fullText: 'Xin chào. Hello.', languageCode: null,
  sourceLanguageStatus: 'NEEDS_CONFIRMATION', status: 'READY', revision: 1 });
const words = () => ({ status: 'completed', output_text: 'Xin chào. Hello.', steps: [{ type: 'model_output', content: [{ type: 'text',
  text: 'Xin chào. Hello.', annotations: [{ type: 'word_info', text: 'Xin chào.', start_offset: '0s', end_offset: '1s' },
    { type: 'word_info', text: 'Hello.', start_offset: '1s', end_offset: '2s' }] }] }] });

before(async () => { await mkdir(uploadRoot, { recursive: true }); await writeFile(resolve(uploadRoot, 'mock.bin'), new Uint8Array([1, 2, 3])); });
after(async () => { setSttProviderForTests(); await rm(uploadRoot, { recursive: true, force: true }); });

function install(t: test.TestContext, options: { project?: any; transcript?: any; dependent?: string; activeJob?: boolean; failProjectWrite?: boolean } = {}) {
  const state = { project: options.project === undefined ? auto() : options.project,
    transcript: options.transcript === undefined ? pendingTranscript() : options.transcript,
    jobs: [] as any[], segments: [] as any[], writes: 0 };
  t.mock.method(mongoose, 'startSession', async () => ({
    async withTransaction(work: () => Promise<any>) {
      const snapshot = { project: state.project ? { ...state.project } : null, transcript: state.transcript ? { ...state.transcript } : null,
        jobs: state.jobs.map(row => ({ ...row })), segments: state.segments.map(row => ({ ...row })), writes: state.writes };
      try { return await work(); } catch (error) { Object.assign(state, snapshot); throw error; }
    }, async endSession() {},
  }) as never);
  t.mock.method(ActivityLog, 'create', async () => ({} as never));
  t.mock.method(Project, 'findOne', (filter: any) => query(state.project && (!filter.userId || filter.userId === ownerId) ? state.project : null));
  t.mock.method(Project, 'findOneAndUpdate', (filter: any, update: any, opts: any) => {
    if (!state.project || (filter.status?.$in && !filter.status.$in.includes(state.project.status))) return query(null);
    const old = { ...state.project }; Object.assign(state.project, update.$set); state.writes++;
    return query(opts?.returnDocument === 'before' ? old : state.project);
  });
  t.mock.method(Project, 'updateOne', async (_filter: any, update: any) => {
    if (options.failProjectWrite) return { matchedCount: 0 } as never;
    Object.assign(state.project, update.$set ?? update); state.writes++; return { matchedCount: 1 } as never;
  });
  t.mock.method(Transcript, 'findOne', () => query(state.transcript));
  t.mock.method(Transcript, 'exists', () => query(state.transcript ? { _id: transcriptId } : null));
  t.mock.method(Transcript, 'create', async (rows: any) => {
    state.transcript = { _id: transcriptId, ...rows[0] }; state.writes++; return [state.transcript] as never;
  });
  t.mock.method(Transcript, 'findOneAndUpdate', (_filter: any, update: any) => {
    Object.assign(state.transcript, update.$set); state.writes++; return query(state.transcript);
  });
  t.mock.method(Transcript, 'updateOne', async (filter: any, update: any) => {
    if (filter.revision !== state.transcript?.revision) return { matchedCount: 0 } as never;
    Object.assign(state.transcript, update.$set); state.writes++; return { matchedCount: 1 } as never;
  });
  t.mock.method(Media, 'findOne', () => query({ mimeType: 'audio/mpeg', storagePath: 'mock.bin' }));
  t.mock.method(TranscriptSegment, 'find', () => query(state.segments));
  t.mock.method(TranscriptSegment, 'deleteMany', async () => { state.segments = []; return {} as never; });
  t.mock.method(TranscriptSegment, 'insertMany', async (rows: any[]) => { state.segments = rows.map(row => ({ _id: new Types.ObjectId(), ...row })); return state.segments as never; });
  t.mock.method(ProcessingJob, 'create', async (row: any) => { const job = { _id: new Types.ObjectId(), ...row }; state.jobs.push(job); return job as never; });
  t.mock.method(ProcessingJob, 'updateOne', async (_filter: any, update: any) => { Object.assign(state.jobs[0] ?? {}, update.$set ?? update); return { matchedCount: 1 } as never; });
  t.mock.method(ProcessingJob, 'exists', () => query(options.activeJob ? {} : null));
  t.mock.method(Translation, 'exists', () => query(options.dependent === 'translation' ? {} : null));
  t.mock.method(Narration, 'exists', () => query(options.dependent === 'narration' ? {} : null));
  t.mock.method(Result, 'exists', () => query(options.dependent === 'result' ? {} : null));
  t.mock.method(TranslationAttempt, 'exists', () => query(options.dependent === 'attempt' ? {} : null));
  return state;
}

test('legacy projects remain MANUAL/CONFIRMED; hints are never detection evidence', () => {
  const old = { sourceLanguage: 'vi' };
  assert.deepEqual(sourceLanguageState(old), { ...old, sourceLanguageMode: 'MANUAL', sourceLanguageStatus: 'CONFIRMED', detectedSourceLanguage: null });
  assert.doesNotThrow(() => assertSourceLanguageConfirmed(old));
  assert.deepEqual(old, { sourceLanguage: 'vi' });
  assert.equal(resolveTranscribedLanguage(old, { languageCode: 'en', evidence: 'PROVIDER_METADATA' }).sourceLanguage, 'vi');
  assert.equal(resolveTranscribedLanguage(old).detectedSourceLanguage, null);
});

test('create/confirm contracts accept legacy and five manual languages, reject fake hints and client detection claims', async t => {
  for (const language of SOURCE_LANGUAGES) {
    assert.equal(createProjectSchema.safeParse({ body: { name: 'Mock', sourceLanguage: language } }).success, true);
    assert.equal(createProjectSchema.safeParse({ body: { name: 'Mock', sourceLanguageMode: 'MANUAL', sourceLanguage: language } }).success, true);
  }
  for (const body of [{ name: 'Mock', sourceLanguage: 'auto' }, { name: 'Mock', sourceLanguageMode: 'MANUAL' },
    { name: 'Mock', sourceLanguage: 'fr' }, { name: 'Mock', sourceLanguageMode: 'AUTO', sourceLanguage: 'vi' },
    { name: 'Mock', detectedSourceLanguage: 'vi' }]) assert.equal(createProjectSchema.safeParse({ body }).success, false);
  assert.equal(confirmSourceLanguageSchema.safeParse({ params: { id: projectId }, body: { sourceLanguage: 'ko', expectedRevision: 1 } }).success, true);
  assert.equal(confirmSourceLanguageSchema.safeParse({ params: { id: projectId }, body: { sourceLanguage: 'fr', expectedRevision: 1 } }).success, false);
  t.mock.method(ActivityLog, 'create', async () => ({} as never));
  t.mock.method(Project, 'create', async (row: any) => ({ ...row, _id: new Types.ObjectId(projectId) }) as never);
  assert.equal((await create(ownerId, { name: 'Legacy', sourceLanguage: 'vi' })).sourceLanguageMode, 'MANUAL');
  const result = await create(ownerId, { name: 'New' });
  assert.equal(result.sourceLanguageMode, 'AUTO'); assert.equal(result.sourceLanguage, null); assert.equal(result.sourceLanguageStatus, 'PENDING_DETECTION');
});

test('schemas preserve legacy required-language validation and permit explicit unresolved AUTO', async () => {
  const base = { userId: ownerId, name: 'Mock' };
  await new Project({ ...base, sourceLanguage: 'vi' }).validate();
  await new Project({ ...base, sourceLanguageMode: 'AUTO', sourceLanguageStatus: 'PENDING_DETECTION', sourceLanguage: null }).validate();
  for (const extra of [{}, { sourceLanguage: 'auto' }, { sourceLanguageMode: 'AUTO' }, { sourceLanguageMode: 'AUTO', sourceLanguageStatus: 'CONFIRMED' }]) {
    await assert.rejects(new Project({ ...base, ...extra }).validate());
  }
  await new Transcript({ projectId, fullText: 'Hello', languageCode: 'en' }).validate();
  await new Transcript({ projectId, fullText: 'Hello', languageCode: null, sourceLanguageStatus: 'NEEDS_CONFIRMATION' }).validate();
  await assert.rejects(new Transcript({ projectId, fullText: 'Hello' }).validate());
  // Run Mongoose update validation without executing any query/connection.
  const update = { $set: { sourceLanguageMode: 'AUTO', sourceLanguageStatus: 'PENDING_DETECTION', sourceLanguage: null } };
  const pending: any = Project.findOneAndUpdate({ _id: projectId }, update, { runValidators: true });
  await pending.validate(update, pending.getOptions(), false);
  const invalid = { $set: { sourceLanguageMode: 'MANUAL', sourceLanguageStatus: 'CONFIRMED', sourceLanguage: null } };
  const manual: any = Project.findOneAndUpdate({ _id: projectId }, invalid, { runValidators: true });
  await assert.rejects(manual.validate(invalid, manual.getOptions(), false));
});

test('AUTO consumes only trusted provider evidence; absent, unsupported or inferred language needs confirmation', () => {
  for (const language of SOURCE_LANGUAGES) {
    const result = resolveTranscribedLanguage({ sourceLanguageMode: 'AUTO' }, { languageCode: language, evidence: 'PROVIDER_METADATA' });
    assert.equal(result.sourceLanguage, language); assert.equal(result.detectedSourceLanguage, language); assert.equal(result.sourceLanguageStatus, 'CONFIRMED');
  }
  assert.equal(resolveTranscribedLanguage({ sourceLanguageMode: 'AUTO' }, { languageCode: 'cmn-Hans-CN', evidence: 'PROVIDER_METADATA' }).sourceLanguage, 'zh');
  for (const evidence of [undefined, { languageCode: 'fr', evidence: 'PROVIDER_METADATA' as const }, { languageCode: 'vi', evidence: 'INPUT' } as any]) {
    const result = resolveTranscribedLanguage({ sourceLanguageMode: 'AUTO', sourceLanguage: 'vi' }, evidence);
    assert.equal(result.sourceLanguage, null); assert.equal(result.detectedSourceLanguage, null); assert.equal(result.sourceLanguageStatus, 'NEEDS_CONFIRMATION');
  }
  const mixed = mapGeminiTranscript(words(), 3);
  assert.equal(mixed.language, undefined); assert.equal(mixed.languageDetection, undefined); assert.equal(mixed.segments.length, 2);
});

test('Gemini mock transport omits AUTO hint, maps five manual locales and preserves word timestamps', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('NO_NETWORK'); });
  const old = process.env.GEMINI_API_KEY; const oldModel = process.env.GEMINI_STT_MODEL;
  process.env.GEMINI_API_KEY = 'synthetic-only'; process.env.GEMINI_STT_MODEL = 'gemini-3.5-transcribe';
  let received: string | undefined; let calls = 0;
  const transport = { async checkModel() {}, async upload() { return { name: 'mock-file', uri: 'mock-uri', state: 'ACTIVE' }; },
    async getFile() { throw new Error('NOT_EXPECTED'); }, async deleteFile() {},
    async transcribe(_model: string, _uri: string, _mime: string, language: string | undefined) { received = language; calls++; return words(); } };
  const provider = new GeminiSttProvider(transport, async () => ({ duration: 3, hasAudio: true, hasVideo: false, format: 'mp3' }));
  const input = { filePath: resolve(uploadRoot, 'mock.bin'), mimeType: 'audio/mpeg' };
  try {
    const result = await provider.transcribe({ ...input, sourceLanguageMode: 'AUTO', language: 'vi' });
    assert.equal(received, undefined); assert.equal(result.languageDetection, undefined); assert.equal(result.language, undefined);
    assert.deepEqual(result.segments.map(s => [s.start, s.end]), [[0, 1], [1, 2]]);
    assert.equal('language_codes' in geminiTranscriptionConfig(), false);
    assert.deepEqual(geminiTranscriptionConfig().mode, { type: 'verbatim', timestamp_granularities: ['word'] });
    const locales = ['vi-VN', 'en-US', 'ja-JP', 'ko-KR', 'cmn-Hans-CN'];
    for (const [index, language] of SOURCE_LANGUAGES.entries()) {
      const manual = await provider.transcribe({ ...input, sourceLanguageMode: 'MANUAL', language });
      assert.equal(received, locales[index]); assert.equal(manual.language, language); assert.equal(manual.languageDetection, undefined);
    }
    assert.equal(calls, 6);
  } finally {
    if (old === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = old;
    if (oldModel === undefined) delete process.env.GEMINI_STT_MODEL; else process.env.GEMINI_STT_MODEL = oldModel;
  }
});

for (const language of SOURCE_LANGUAGES) test(`MANUAL ${language}: transcription preserves source, jobs, revisions and segments`, async t => {
  const project = { ...auto(), sourceLanguageMode: 'MANUAL', sourceLanguage: language, sourceLanguageStatus: 'CONFIRMED', status: 'UPLOADED' };
  const state = install(t, { project, transcript: null });
  setSttProviderForTests({ async transcribe(input) { assert.equal(input.language, language); assert.equal(input.sourceLanguageMode, 'MANUAL'); return { text: 'Mock speech', segments: [{ start: 0, end: 1, text: 'Mock speech' }] }; } });
  try {
    await transcribe(projectId, ownerId);
    assert.equal(state.project.status, 'TRANSCRIBED'); assert.equal(state.transcript.languageCode, language); assert.equal(state.transcript.revision, 1);
    assert.equal(state.jobs[0].status, 'COMPLETED'); assert.equal(state.segments.length, 1); assert.equal(state.project.detectedSourceLanguage, null);
  } finally { setSttProviderForTests(); }
});

for (const scenario of ['legacy', 'metadata', 'no-metadata', 'no-speech']) test(`STT lifecycle ${scenario} without real provider or DB`, async t => {
  const project: any = { ...auto(), status: 'UPLOADED' };
  if (scenario === 'legacy') { delete project.sourceLanguageMode; delete project.sourceLanguageStatus; project.sourceLanguage = 'vi'; }
  const state = install(t, { project, transcript: null });
  setSttProviderForTests({ async transcribe(input) {
    assert.equal(input.language, scenario === 'legacy' ? 'vi' : undefined);
    if (scenario === 'no-speech') throw new GeminiSttError('STT_NO_SPEECH');
    return { text: 'Mock speech', language: 'vi', ...(scenario === 'metadata' ? { languageDetection: { languageCode: 'ja', evidence: 'PROVIDER_METADATA' as const } } : {}), segments: [{ start: 0, end: 1, text: 'Mock speech' }] };
  } });
  try {
    if (scenario === 'no-speech') {
      await assert.rejects(transcribe(projectId, ownerId), code('STT_NO_SPEECH'));
      assert.equal(state.project.status, 'FAILED'); assert.equal(state.jobs[0].status, 'FAILED'); assert.equal(state.transcript, null);
    } else {
      const response = await transcribe(projectId, ownerId);
      assert.equal(state.project.status, 'TRANSCRIBED');
      const language = scenario === 'legacy' ? 'vi' : scenario === 'metadata' ? 'ja' : null;
      assert.equal(state.project.sourceLanguage, language); assert.equal(state.transcript.languageCode, language); assert.equal(response.transcript.language, language);
      assert.equal(state.project.sourceLanguageStatus, language ? 'CONFIRMED' : 'NEEDS_CONFIRMATION');
      assert.equal(state.project.detectedSourceLanguage, scenario === 'metadata' ? 'ja' : null);
    }
  } finally { setSttProviderForTests(); }
});

test('confirmation atomically sets real source, increments revision, preserves mode/detection and is idempotent', async t => {
  const state = install(t);
  const result = await confirmSourceLanguage(projectId, ownerId, 'en', 1);
  assert.equal(result.sourceLanguageStatus, 'CONFIRMED'); assert.equal(state.project.sourceLanguageMode, 'AUTO'); assert.equal(state.project.detectedSourceLanguage, null);
  assert.equal(state.transcript.languageCode, 'en'); assert.equal(state.transcript.revision, 2);
  const writes = state.writes;
  await assert.rejects(confirmSourceLanguage(projectId, ownerId, 'ja', 1), code('SOURCE_LANGUAGE_REVISION_CONFLICT'));
  assert.equal((await confirmSourceLanguage(projectId, ownerId, 'en', 2)).idempotent, true); assert.equal(state.writes, writes);
});

for (const dependent of ['translation', 'narration', 'result', 'attempt']) test(`confirmation preserves dependent ${dependent}`, async t => {
  const state = install(t, { dependent }); const snapshot = JSON.stringify(state);
  await assert.rejects(confirmSourceLanguage(projectId, ownerId, 'en', 1), code('SOURCE_LANGUAGE_HAS_DEPENDENTS'));
  assert.equal(JSON.stringify(state), snapshot);
});

test('confirmation rejects bad language/revision/owner, missing transcript and concurrent work without writes', async t => {
  const state = install(t, { activeJob: true });
  await assert.rejects(confirmSourceLanguage(projectId, ownerId, 'fr', 1), code('SOURCE_LANGUAGE_INVALID'));
  await assert.rejects(confirmSourceLanguage(projectId, ownerId, 'en', 0), code('SOURCE_LANGUAGE_INVALID'));
  await assert.rejects(confirmSourceLanguage(projectId, new Types.ObjectId().toString(), 'en', 1), code('PROJECT_NOT_FOUND'));
  await assert.rejects(confirmSourceLanguage(projectId, ownerId, 'en', 2), code('SOURCE_LANGUAGE_REVISION_CONFLICT'));
  await assert.rejects(confirmSourceLanguage(projectId, ownerId, 'en', 1), code('SOURCE_LANGUAGE_BUSY'));
  state.transcript = null;
  await assert.rejects(confirmSourceLanguage(projectId, ownerId, 'en', 1), code('TRANSCRIPT_NOT_FOUND'));
  assert.equal(state.writes, 0);
});

test('confirmation rolls back transcript if project fence fails', async t => {
  const state = install(t, { failProjectWrite: true });
  await assert.rejects(confirmSourceLanguage(projectId, ownerId, 'zh', 1), code('SOURCE_LANGUAGE_REVISION_CONFLICT'));
  assert.equal(state.transcript.languageCode, null); assert.equal(state.transcript.revision, 1); assert.equal(state.writes, 0);
});

test('generic PATCH cannot bypass confirmation; established source cannot change silently', async t => {
  const state = install(t);
  await assert.rejects(updateProjectSource(projectId, ownerId, { sourceLanguage: 'en' }), code('SOURCE_LANGUAGE_CONFIRMATION_REQUIRED'));
  state.project.sourceLanguage = 'vi'; state.project.sourceLanguageStatus = 'CONFIRMED'; state.transcript.languageCode = 'vi';
  await assert.rejects(confirmSourceLanguage(projectId, ownerId, 'en', 1), code('SOURCE_LANGUAGE_REVISION_REQUIRED'));
  assert.equal(state.writes, 0);
});

test('pre-transcript source switch is allowed only before work; same legacy language remains editable', async t => {
  const state = install(t, { project: { ...auto(), status: 'DRAFT' }, transcript: null });
  await updateProjectSource(projectId, ownerId, { sourceLanguage: 'ko', sourceLanguageMode: 'MANUAL' });
  assert.equal(state.project.sourceLanguage, 'ko'); assert.equal(state.project.sourceLanguageStatus, 'CONFIRMED');
  await updateProjectSource(projectId, ownerId, { sourceLanguageMode: 'AUTO' });
  assert.equal(state.project.sourceLanguage, null); assert.equal(state.project.sourceLanguageStatus, 'PENDING_DETECTION');
  state.project.sourceLanguageMode = 'MANUAL'; state.project.sourceLanguage = 'vi'; state.project.sourceLanguageStatus = 'CONFIRMED'; state.project.status = 'TRANSCRIBED';
  state.transcript = { ...pendingTranscript(), languageCode: 'vi' };
  await updateProjectSource(projectId, ownerId, { sourceLanguage: 'vi', name: 'Renamed' });
  assert.equal(state.project.name, 'Renamed'); assert.equal(state.transcript.revision, 1);
});

test('both legacy and grouped translation block unresolved source before provider/quota/attempt', async t => {
  install(t);
  let calls = 0;
  const provider = { async translate() { calls++; throw new Error('MUST_NOT_CALL'); } };
  await assert.rejects(translate(projectId, ownerId, 'en'), code('SOURCE_LANGUAGE_UNCONFIRMED'));
  await assert.rejects(new GroupTranslationService(provider).plan(projectId, ownerId, 'en'), code('SOURCE_LANGUAGE_UNCONFIRMED'));
  assert.equal(calls, 0);
});

test('project workflow cannot advertise translation READY while AUTO source is unresolved', async t => {
  const state = install(t);
  t.mock.method(Media, 'find', () => query([{ projectId, mediaType: 'VIDEO' }]));
  t.mock.method(Transcript, 'find', () => query([state.transcript]));
  t.mock.method(Translation, 'find', () => query([]));
  t.mock.method(Narration, 'find', () => query([]));
  t.mock.method(Result, 'find', () => query([]));
  t.mock.method(ProcessingJob, 'aggregate', async () => [] as never);
  const pending = await getProject(projectId, ownerId);
  assert.equal(pending.sourceLanguage, null); assert.equal(pending.workflow?.step, 'TRANSLATION');
  assert.equal(pending.workflow?.state, 'BLOCKED'); assert.equal(pending.workflow?.canResume, false);
  state.project.sourceLanguage = 'vi'; state.project.sourceLanguageStatus = 'CONFIRMED'; state.transcript.languageCode = 'vi';
  assert.equal((await getProject(projectId, ownerId)).workflow?.state, 'READY');
});

test('SIMPLE preflight exposes SOURCE_LANGUAGE_UNCONFIRMED and performs no attempt/quota/provider operation', async t => {
  install(t);
  t.mock.method(Transcript, 'aggregate', () => ({ session: () => query([pendingTranscript()]) }) as never);
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'development';
  const forbidden = async () => { throw new Error('MUST_NOT_RUN'); };
  try {
    const result = await customerSimplePreflight(projectId, ownerId, { owns: async () => true, project: async () => ({ status: 'TRANSCRIBED', sourceLanguage: null, sourceLanguageMode: 'AUTO', sourceLanguageStatus: 'NEEDS_CONFIRMATION' }), load: loadSource,
      attempt: forbidden, translation: async () => false, jobs: async () => false, drafts: forbidden, quota: forbidden, deployment: forbidden, durableConflicts: forbidden } as any);
    assert.equal(result.status, 'BLOCKED'); assert.ok(result.reasonCodes.includes('SOURCE_LANGUAGE_UNCONFIRMED'));
  } finally { process.env.NODE_ENV = previous; }
});

for (const legacy of [true, false]) test(`Customer SIMPLE vi -> en regression (${legacy ? 'legacy missing mode' : 'confirmed AUTO'}), mock provider/attempt only`, async t => {
  const project: any = { ...auto(), sourceLanguage: 'vi', sourceLanguageStatus: 'CONFIRMED' };
  if (legacy) { delete project.sourceLanguageMode; delete project.sourceLanguageStatus; }
  const state = install(t, { project, transcript: { ...pendingTranscript(), languageCode: 'vi', sourceLanguageStatus: 'CONFIRMED', fullText: 'Xin chào.' } });
  const source = { ...state.transcript, revision: 1 };
  const segmentId = new Types.ObjectId();
  t.mock.method(Transcript, 'aggregate', () => ({ session: () => query([source]) }) as never);
  t.mock.method(TranscriptSegment, 'aggregate', () => ({ session: () => ({ cursor: () => ({
    async *[Symbol.asyncIterator]() { yield { _id: segmentId, sequence: 1, text: 'Xin chào.', startTime: 0, endTime: 1 }; }, async close() {},
  }) }) }) as never);
  const { Language } = await import('../src/models/Language.js');
  t.mock.method(Language, 'exists', () => query({ _id: 'mock-language' }));
  let claims = 0; let providers = 0;
  t.mock.method(customerAttempts, 'execute', async (_scope: any, _binding: any, work: any) => { claims++; return work(); });
  const service = new GroupTranslationService({ async translate(input) { providers++; assert.equal(input.sourceLanguage, 'vi'); assert.equal(input.targetLanguage, 'en'); return input.groups.map(group => ({ groupId: group.groupId, translatedText: 'Hello.' })); } });
  const previous = { ...process.env };
  Object.assign(process.env, { CUSTOMER_TRANSLATION_ENABLED: 'true', CUSTOMER_TRANSLATION_METHOD: 'GEMINI_SIMPLE_V1', CUSTOMER_TRANSLATION_THINKING: 'DEFAULT' });
  delete process.env.CONTROLLED_PROVIDER_MODE;
  try {
    const draft = await service.customerGenerate(projectId, ownerId);
    assert.equal(draft.sourceLanguage, 'vi'); assert.equal(draft.targetLanguage, 'en'); assert.equal(draft.groups[0]?.translatedText, 'Hello.');
    assert.equal(claims, 1); assert.equal(providers, 1); assert.equal(state.writes, 0);
  } finally { process.env = previous; }
});

test('confirmation HTTP route requires real auth middleware, owner and strict validation (mock users only)', async t => {
  const state = install(t);
  t.mock.method(User, 'findOne', async () => ({ _id: new Types.ObjectId(ownerId), role: 'CUSTOMER', status: 'ACTIVE', fullName: 'Mock', email: 'mock@example.invalid' }) as never);
  const app = express(); app.use(express.json()); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(done => server.once('listening', done));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const token = signAccessToken(ownerId, 'CUSTOMER');
  const call = (body: unknown, authenticated = true) => fetch(`http://127.0.0.1:${address.port}/api/projects/${projectId}/source-language/confirm`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(authenticated ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await call({ sourceLanguage: 'en', expectedRevision: 1 }, false)).status, 401);
    assert.equal((await call({ sourceLanguage: 'fr', expectedRevision: 1 })).status, 400);
    assert.equal((await call({ sourceLanguage: 'en', expectedRevision: 1, detectedSourceLanguage: 'en' })).status, 400);
    const response = await call({ sourceLanguage: 'en', expectedRevision: 1 }); assert.equal(response.status, 200);
    assert.equal((await response.json() as any).data.sourceLanguageStatus, 'CONFIRMED');
    assert.equal(state.project.sourceLanguage, 'en');
    state.project = null;
    assert.equal((await call({ sourceLanguage: 'en', expectedRevision: 2 })).status, 404);
  } finally { await new Promise<void>((done, fail) => server.close(error => error ? fail(error) : done())); }
});
