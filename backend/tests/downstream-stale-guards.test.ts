import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { Narration } from '../src/models/Narration.js';
import { Result } from '../src/models/Result.js';
import { Translation } from '../src/models/Translation.js';
import { Transcript } from '../src/models/Transcript.js';
import { Voice } from '../src/models/Voice.js';
import { getNarration, listNarrations } from '../src/services/narration.service.js';
import { getResult, listResults } from '../src/services/result.service.js';

const projectId = new Types.ObjectId().toString();
const transcriptId = new Types.ObjectId();
const translationId = new Types.ObjectId();
const narrationId = new Types.ObjectId();
const resultId = new Types.ObjectId();
const voiceId = new Types.ObjectId();
const now = new Date();
const query = <T>(value: T) => ({
  sort() { return this; }, select() { return this; },
  then(resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) { return Promise.resolve(value).then(resolve, reject); },
});

const records = (sourceTranscriptRevision: number | undefined, transcriptRevision = 2) => ({
  transcript: { _id: transcriptId, revision: transcriptRevision },
  translation: { _id: translationId, projectId: new Types.ObjectId(projectId), transcriptId, revision: 4, sourceTranscriptRevision },
  narration: { _id: narrationId, projectId: new Types.ObjectId(projectId), translationId, revision: 3, sourceTranslationRevision: 4,
    voiceId, languageCode: 'en', speed: 1, mimeType: 'audio/mpeg', fileSize: 10, provider: 'mock', model: 'mock', status: 'READY', createdAt: now, updatedAt: now },
  result: { _id: resultId, projectId: new Types.ObjectId(projectId), narrationId, sourceNarrationRevision: 3,
    languageCode: 'en', mimeType: 'video/mp4', fileSize: 10, duration: 1, createdAt: now, updatedAt: now },
});

const install = (t: test.TestContext, sourceRevision: number | undefined, transcriptRevision = 2) => {
  const data = records(sourceRevision, transcriptRevision);
  t.mock.method(Narration, 'findOne', () => query(data.narration) as never);
  t.mock.method(Narration, 'find', () => query([data.narration]) as never);
  t.mock.method(Translation, 'findOne', () => query(data.translation) as never);
  t.mock.method(Translation, 'find', () => query([data.translation]) as never);
  t.mock.method(Transcript, 'findOne', () => query(data.transcript) as never);
  t.mock.method(Transcript, 'find', () => query([data.transcript]) as never);
  t.mock.method(Result, 'findOne', () => query(data.result) as never);
  t.mock.method(Result, 'find', () => query([data.result]) as never);
  t.mock.method(Voice, 'findById', () => query({ name: 'Giọng thử nghiệm' }) as never);
  return data;
};

test('current provenance chain remains readable and appears in lists', async (t) => {
  install(t, 2, 2);
  assert.equal((await getNarration(projectId, narrationId.toString())).id, narrationId.toString());
  assert.equal((await getResult(projectId, resultId.toString())).id, resultId.toString());
  assert.equal((await listNarrations(projectId)).length, 1);
  assert.equal((await listResults(projectId)).length, 1);
});

test('transcript revision change blocks stale narration and result access and omits them from lists', async (t) => {
  install(t, 1, 2);
  await assert.rejects(() => getNarration(projectId, narrationId.toString()), (error: any) => error.code === 'NARRATION_PROVENANCE_INVALID' && error.statusCode === 409);
  await assert.rejects(() => getResult(projectId, resultId.toString()), (error: any) => error.code === 'RESULT_PROVENANCE_INVALID' && error.statusCode === 409);
  assert.equal((await listNarrations(projectId)).length, 0);
  assert.equal((await listResults(projectId)).length, 0);
});

test('legacy missing provenance is UNKNOWN and fails closed', async (t) => {
  install(t, undefined, 2);
  await assert.rejects(() => getNarration(projectId, narrationId.toString()), (error: any) => error.code === 'NARRATION_PROVENANCE_INVALID');
  await assert.rejects(() => getResult(projectId, resultId.toString()), (error: any) => error.code === 'RESULT_PROVENANCE_INVALID');
});
