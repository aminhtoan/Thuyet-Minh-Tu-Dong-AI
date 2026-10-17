import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectStatus } from '../src/constants/project.constants.js';
import {
  resolveProjectWorkflow,
  resolveProjectWorkflows,
  type ProjectWorkflowBatchReader,
  type ProjectWorkflowEvidence,
  type WorkflowProjectInput,
} from '../src/services/project-workflow.service.js';

const media = { projectId: 'project', mediaType: 'VIDEO' as const };
const transcript = { projectId: 'project' };
const translation = { projectId: 'project', targetLanguage: 'en' };
const narration = { id: 'narration', projectId: 'project', languageCode: 'en' };
const result = { projectId: 'project', languageCode: 'en' };
const activeJob = (type: 'TRANSCRIPTION' | 'TRANSLATION' | 'TTS' | 'VIDEO_PROCESSING') => ({
  id: `job-${type}`, projectId: 'project', type, status: 'PROCESSING' as const, progress: 0,
  targetLanguage: type === 'TRANSCRIPTION' ? undefined : 'en',
  narrationId: type === 'VIDEO_PROCESSING' ? 'narration' : undefined,
});
const evidence = (changes: Partial<ProjectWorkflowEvidence> = {}): ProjectWorkflowEvidence => ({
  media: null, transcript: null, translations: [], narrations: [], results: [], latestJob: null, ...changes,
});
const resolve = (status: ProjectStatus, changes: Partial<ProjectWorkflowEvidence> = {}) =>
  resolveProjectWorkflow({ id: 'project', status }, evidence(changes));

test('workflow resolver covers all ten project statuses with evidence-backed destinations', () => {
  const cases: Array<[ProjectStatus, ProjectWorkflowEvidence, string, string]> = [
    ['DRAFT', evidence(), 'UPLOAD', 'READY'],
    ['UPLOADED', evidence({ media }), 'TRANSCRIPT', 'READY'],
    ['TRANSCRIBING', evidence({ media, latestJob: activeJob('TRANSCRIPTION') }), 'TRANSCRIPT', 'PROCESSING'],
    ['TRANSCRIBED', evidence({ media, transcript }), 'TRANSLATION', 'READY'],
    ['TRANSLATING', evidence({ media, transcript, latestJob: activeJob('TRANSLATION') }), 'TRANSLATION', 'PROCESSING'],
    ['TRANSLATED', evidence({ media, transcript, translations: [translation] }), 'VOICE', 'READY'],
    ['GENERATING_AUDIO', evidence({ media, transcript, translations: [translation], latestJob: activeJob('TTS') }), 'VOICE', 'PROCESSING'],
    ['PROCESSING_VIDEO', evidence({ media, narrations: [narration], latestJob: activeJob('VIDEO_PROCESSING') }), 'GENERATE', 'PROCESSING'],
    ['COMPLETED', evidence({ media, narrations: [narration], results: [result] }), 'RESULT', 'COMPLETED'],
    ['FAILED', evidence({ media, latestJob: {
      ...activeJob('TRANSCRIPTION'), status: 'FAILED', errorMessage: 'STT_TIMEOUT', completedAt: new Date('2026-01-01T00:00:00Z'),
    } }), 'TRANSCRIPT', 'FAILED'],
  ];
  for (const [status, input, step, state] of cases) {
    const summary = resolveProjectWorkflow({ id: 'project', status }, input);
    assert.equal(summary.step, step, status);
    assert.equal(summary.state, state, status);
    assert.equal(summary.canResume, true, status);
  }
});

test('processing preserves progress zero and target-language provenance', () => {
  const summary = resolve('TRANSLATING', { media, transcript, latestJob: activeJob('TRANSLATION') });
  assert.equal(summary.processing?.progress, 0);
  assert.deepEqual(summary.targetLanguage, { code: 'en', source: 'JOB' });
  assert.deepEqual(resolve('TRANSLATED', { media, translations: [translation] }).targetLanguage, { code: 'en', source: 'TRANSLATION' });
  assert.deepEqual(resolve('GENERATING_AUDIO', { media, narrations: [narration] }).targetLanguage, { code: 'en', source: 'NARRATION' });
  assert.deepEqual(resolve('COMPLETED', { media, results: [result] }).targetLanguage, { code: 'en', source: 'RESULT' });
});

test('failed jobs resolve all four evidence-backed stages', () => {
  const failed = (type: 'TRANSCRIPTION' | 'TRANSLATION' | 'TTS' | 'VIDEO_PROCESSING') => ({
    ...activeJob(type), status: 'FAILED' as const, errorMessage: type === 'VIDEO_PROCESSING' ? 'MEDIA_PROCESSING_FAILED' : undefined,
    completedAt: new Date('2026-01-01T00:00:00Z'),
  });
  const cases = [
    resolve('FAILED', { media, latestJob: failed('TRANSCRIPTION') }),
    resolve('FAILED', { media, transcript, latestJob: failed('TRANSLATION') }),
    resolve('FAILED', { media, translations: [translation], latestJob: failed('TTS') }),
    resolve('FAILED', { media, narrations: [narration], latestJob: failed('VIDEO_PROCESSING') }),
  ];
  assert.deepEqual(cases.map((item) => item.step), ['TRANSCRIPT', 'TRANSLATION', 'VOICE', 'GENERATE']);
  assert.equal(cases.every((item) => item.state === 'FAILED' && item.canResume && item.failure), true);
});

test('failed workflow is fail-closed for ambiguous evidence and never exposes a raw provider message', () => {
  const ambiguous = resolve('FAILED', { media, latestJob: {
    ...activeJob('TRANSLATION'), status: 'FAILED', completedAt: new Date('2026-01-01T00:00:00Z'),
  } });
  assert.equal(ambiguous.step, 'UNKNOWN');
  assert.equal(ambiguous.state, 'BLOCKED');
  assert.equal(ambiguous.canResume, false);
  assert.equal(ambiguous.failure, null);

  const safe = resolve('FAILED', { media, latestJob: {
    ...activeJob('TRANSCRIPTION'), status: 'FAILED', errorMessage: 'secret provider stack', completedAt: new Date('2026-01-01T00:00:00Z'),
  } });
  assert.equal(safe.failure?.code, 'PROCESSING_FAILED');
  assert.equal(JSON.stringify(safe).includes('secret provider stack'), false);
});

test('audio and video artifacts resolve without changing the persisted state machine', () => {
  const completedTts = { ...activeJob('TTS'), status: 'COMPLETED' as const, progress: 100, completedAt: new Date() };
  const audio = resolve('GENERATING_AUDIO', { media: { ...media, mediaType: 'AUDIO' }, narrations: [narration], latestJob: completedTts });
  assert.equal(audio.step, 'RESULT');
  assert.equal(audio.state, 'COMPLETED');
  assert.deepEqual(audio.targetLanguage, { code: 'en', source: 'JOB' });
  assert.equal(audio.artifact.narrationReady, true);

  const video = resolve('GENERATING_AUDIO', { media, narrations: [narration], latestJob: completedTts });
  assert.equal(video.step, 'GENERATE');
  assert.equal(video.state, 'READY');
});

test('missing or inconsistent artifacts return UNKNOWN/BLOCKED', () => {
  for (const status of ['UPLOADED', 'TRANSCRIBED', 'TRANSLATED', 'PROCESSING_VIDEO', 'COMPLETED'] as const) {
    const summary = resolve(status);
    assert.equal(summary.step, 'UNKNOWN', status);
    assert.equal(summary.state, 'BLOCKED', status);
    assert.equal(summary.canResume, false, status);
  }
  const ambiguousTarget = resolve('TRANSLATED', {
    media, translations: [translation, { projectId: 'project', targetLanguage: 'ja' }],
  });
  assert.equal(ambiguousTarget.step, 'UNKNOWN');
  assert.equal(ambiguousTarget.canResume, false);
});

test('batch resolver performs six fixed reads rather than one query per project', async () => {
  const calls = { media: 0, transcripts: 0, translations: 0, narrations: 0, results: 0, jobs: 0 };
  const reader: ProjectWorkflowBatchReader = {
    readMedia: async () => { calls.media += 1; return []; },
    readTranscripts: async () => { calls.transcripts += 1; return []; },
    readTranslations: async () => { calls.translations += 1; return []; },
    readNarrations: async () => { calls.narrations += 1; return []; },
    readResults: async () => { calls.results += 1; return []; },
    readLatestJobs: async () => { calls.jobs += 1; return []; },
  };
  const projects: WorkflowProjectInput[] = Array.from({ length: 100 }, (_, index) => ({ id: String(index), status: 'DRAFT' }));
  const summaries = await resolveProjectWorkflows(projects, reader);
  assert.equal(summaries.size, 100);
  assert.deepEqual(calls, { media: 1, transcripts: 1, translations: 1, narrations: 1, results: 1, jobs: 1 });
});

