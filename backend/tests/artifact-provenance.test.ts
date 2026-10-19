import assert from 'node:assert/strict';
import test from 'node:test';
import { Narration } from '../src/models/Narration.js';
import { ProcessingJob } from '../src/models/ProcessingJob.js';
import { Result } from '../src/models/Result.js';
import { Transcript } from '../src/models/Transcript.js';
import { Translation } from '../src/models/Translation.js';
import {
  jobProvenance,
  narrationProvenance,
  nextRevision,
  resultProvenance,
  revisionCasFilter,
  revisionFenceOperation,
  translationProvenance,
} from '../src/services/artifact-provenance.service.js';
import { resolveProjectWorkflows, type ProjectWorkflowBatchReader } from '../src/services/project-workflow.service.js';

test('revision initialization is explicit, monotonic and never based on updatedAt', () => {
  assert.equal(nextRevision(undefined), 1);
  assert.equal(nextRevision(null), 1);
  assert.equal(nextRevision(1), 2);
  assert.equal(nextRevision(41), 42);
  assert.throws(() => nextRevision(0), /INVALID_REVISION/);
  assert.throws(() => nextRevision(1.5), /INVALID_REVISION/);
  assert.throws(() => nextRevision(Number.MAX_SAFE_INTEGER), /INVALID_REVISION/);
});

test('compare-and-set filter makes two edits with the same revision mutually exclusive', () => {
  const first = revisionCasFilter('transcript-a', 7);
  const second = revisionCasFilter('transcript-a', 7);
  let storedRevision = 7;
  const apply = (filter: typeof first) => {
    if (filter.revision !== storedRevision) return false;
    storedRevision = nextRevision(storedRevision);
    return true;
  };
  assert.equal(apply(first), true);
  assert.equal(apply(second), false);
  assert.equal(storedRevision, 8);
});

test('downstream revision fence conflicts after a concurrent source edit without incrementing revision', () => {
  const fence = revisionFenceOperation('transcript-a', 7);
  assert.deepEqual(fence, { filter: { _id: 'transcript-a', revision: 7 }, update: { $set: { revision: 7 } } });
  let storedRevision = 7;
  storedRevision = nextRevision(storedRevision);
  assert.equal(fence.filter.revision === storedRevision, false);
  assert.equal(storedRevision, 8);
});

test('translation provenance distinguishes current, stale and legacy unknown', () => {
  const transcript = { id: 'transcript-a', revision: 3 };
  assert.equal(translationProvenance({ transcriptId: 'transcript-a', sourceTranscriptRevision: 3 }, transcript), 'CURRENT');
  assert.equal(translationProvenance({ transcriptId: 'transcript-a', sourceTranscriptRevision: 2 }, transcript), 'STALE');
  assert.equal(translationProvenance({ transcriptId: 'transcript-b', sourceTranscriptRevision: 3 }, transcript), 'STALE');
  assert.equal(translationProvenance({ transcriptId: 'transcript-a' }, transcript), 'UNKNOWN');
  assert.equal(translationProvenance({ transcriptId: 'transcript-a', sourceTranscriptRevision: 3 }, { id: 'transcript-a' }), 'UNKNOWN');
});

test('narration and result require the complete upstream provenance chain', () => {
  const translation = { id: 'translation-a', revision: 5 };
  const narration = { id: 'narration-a', revision: 2, translationId: 'translation-a', sourceTranslationRevision: 5 };
  assert.equal(narrationProvenance(narration, translation, 'CURRENT'), 'CURRENT');
  assert.equal(narrationProvenance({ ...narration, sourceTranslationRevision: 4 }, translation, 'CURRENT'), 'STALE');
  assert.equal(narrationProvenance(narration, translation, 'STALE'), 'STALE');
  assert.equal(narrationProvenance(narration, translation, 'UNKNOWN'), 'UNKNOWN');
  assert.equal(resultProvenance({ narrationId: 'narration-a', sourceNarrationRevision: 2 }, narration, 'CURRENT'), 'CURRENT');
  assert.equal(resultProvenance({ narrationId: 'narration-a', sourceNarrationRevision: 1 }, narration, 'CURRENT'), 'STALE');
  assert.equal(resultProvenance({ narrationId: 'narration-a' }, narration, 'CURRENT'), 'UNKNOWN');
});

test('late jobs become stale when their captured source revision changes', () => {
  assert.equal(jobProvenance({ type: 'TRANSLATION', sourceTranscriptId: 't', sourceTranscriptRevision: 4 }, { transcript: { id: 't', revision: 5 } }), 'STALE');
  assert.equal(jobProvenance({ type: 'TTS', sourceTranslationId: 'tr', sourceTranslationRevision: 2 }, { translation: { id: 'tr', revision: 3 } }), 'STALE');
  assert.equal(jobProvenance({ type: 'VIDEO_PROCESSING', sourceNarrationId: 'n', sourceNarrationRevision: 1 }, { narration: { id: 'n', revision: 2 } }), 'STALE');
  assert.equal(jobProvenance({ type: 'TTS', sourceTranslationId: 'tr', sourceTranslationRevision: 2 }, { translation: { id: 'tr', revision: 2 } }), 'CURRENT');
  assert.equal(jobProvenance({ type: 'VIDEO_PROCESSING' }, { narration: { id: 'n', revision: 2 } }), 'UNKNOWN');
  assert.equal(jobProvenance({ type: 'TRANSCRIPTION' }, {}), 'CURRENT');
});

test('schema additions are optional for legacy data and have no fake defaults', () => {
  assert.equal(new Transcript().revision, undefined);
  assert.equal(new Translation().revision, undefined);
  assert.equal(new Translation().sourceTranscriptRevision, undefined);
  assert.equal(new Narration().revision, undefined);
  assert.equal(new Narration().sourceTranslationRevision, undefined);
  assert.equal(new Result().sourceNarrationRevision, undefined);
  const job = new ProcessingJob();
  assert.equal(job.sourceTranscriptRevision, undefined);
  assert.equal(job.sourceTranslationRevision, undefined);
  assert.equal(job.sourceNarrationRevision, undefined);
});

test('revision fields reject zero and non-integer values without a database connection', async () => {
  const transcript = new Transcript({ projectId: '507f1f77bcf86cd799439011', languageCode: 'vi', fullText: 'Xin chào', status: 'READY', revision: 0 });
  await assert.rejects(transcript.validate(), /revision/);
  const translation = new Translation({ projectId: '507f1f77bcf86cd799439011', transcriptId: '507f1f77bcf86cd799439012', sourceLanguage: 'vi', targetLanguage: 'en', fullText: 'Hello', status: 'READY', revision: 1.5 });
  await assert.rejects(translation.validate(), /revision/);
});

test('workflow batch evidence accepts only CURRENT artifacts and fails closed for stale or legacy data', async () => {
  const projects = ['current', 'stale', 'legacy'].map((id) => ({ id, status: 'TRANSLATED' as const }));
  const reader: ProjectWorkflowBatchReader = {
    readMedia: async (ids) => ids.map((projectId) => ({ projectId, mediaType: 'AUDIO' as const })),
    readTranscripts: async (ids) => ids.map((projectId) => ({ id: `transcript-${projectId}`, projectId, revision: 2 })),
    readTranslations: async () => [
      { id: 'translation-current', projectId: 'current', transcriptId: 'transcript-current', revision: 1, sourceTranscriptRevision: 2, targetLanguage: 'en' },
      { id: 'translation-stale', projectId: 'stale', transcriptId: 'transcript-stale', revision: 1, sourceTranscriptRevision: 1, targetLanguage: 'en' },
      { id: 'translation-legacy', projectId: 'legacy', transcriptId: 'transcript-legacy', targetLanguage: 'en' },
    ],
    readNarrations: async () => [], readResults: async () => [], readLatestJobs: async () => [],
  };
  const summaries = await resolveProjectWorkflows(projects, reader);
  assert.equal(summaries.get('current')?.step, 'VOICE');
  assert.equal(summaries.get('stale')?.step, 'UNKNOWN');
  assert.equal(summaries.get('legacy')?.step, 'UNKNOWN');
});
