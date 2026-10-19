import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose, { Types } from 'mongoose';
import { ActivityLog } from '../src/models/ActivityLog.js';
import { ProcessingJob } from '../src/models/ProcessingJob.js';
import { Project } from '../src/models/Project.js';
import { Transcript } from '../src/models/Transcript.js';
import { TranscriptSegment } from '../src/models/TranscriptSegment.js';
import { rebuildTranscriptFullText, updateTranscriptSegment } from '../src/services/transcription.service.js';
import { updateTranscriptSegmentSchema } from '../src/validators/transcription.validator.js';

const projectId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();
const transcriptId = new Types.ObjectId();
const segmentIds = [new Types.ObjectId(), new Types.ObjectId()];

const query = <T>(value: T) => ({
  session: () => Promise.resolve(value),
  sort: () => query(value),
  then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(value).then(resolve, reject),
});

type State = { revision?: number; fullText: string; texts: string[]; project: boolean; activeJob: boolean; status: string; transcript?: boolean };
const install = (t: test.TestContext, state: State, failSegmentWrite = false) => {
  let transactionSnapshot: State | undefined;
  t.mock.method(ActivityLog, 'create', async () => ({} as never));
  t.mock.method(mongoose, 'startSession', async () => ({
    async withTransaction(action: () => Promise<void>) {
      transactionSnapshot = structuredClone(state);
      try { await action(); } catch (error) { Object.assign(state, transactionSnapshot); throw error; }
    },
    async endSession() {},
  }) as never);
  t.mock.method(Project, 'findOne', () => query(state.project ? { _id: new Types.ObjectId(projectId), status: state.status } : null) as never);
  t.mock.method(ProcessingJob, 'findOne', () => query(state.activeJob ? { _id: new Types.ObjectId() } : null) as never);
  t.mock.method(Transcript, 'findOne', () => query(state.transcript === false ? null : {
    _id: transcriptId, projectId: new Types.ObjectId(projectId), languageCode: 'vi', fullText: state.fullText,
    status: 'READY', revision: state.revision, createdAt: new Date(), updatedAt: new Date(),
  }) as never);
  t.mock.method(Transcript, 'updateOne', async (filter: { revision?: number }, update: { $set: { revision: number; fullText: string } }) => {
    if (state.revision !== filter.revision) return { matchedCount: 0 } as never;
    state.revision = update.$set.revision; state.fullText = update.$set.fullText;
    return { matchedCount: 1 } as never;
  });
  t.mock.method(TranscriptSegment, 'findOne', (filter: { _id: unknown }) => {
    const index = segmentIds.findIndex((id) => id.toString() === String(filter._id));
    return query(index < 0 ? null : { _id: segmentIds[index], transcriptId, sequence: index + 1, startTime: index, endTime: index + 1, text: state.texts[index] }) as never;
  });
  t.mock.method(TranscriptSegment, 'find', () => query(state.texts.map((text, index) => ({
    _id: segmentIds[index], transcriptId, sequence: index + 1, startTime: index, endTime: index + 1, text,
  }))) as never);
  t.mock.method(TranscriptSegment, 'updateOne', async (filter: { _id: unknown; text: string }, update: { $set: { text: string } }) => {
    if (failSegmentWrite) return { matchedCount: 0 } as never;
    const index = segmentIds.findIndex((id) => id.toString() === String(filter._id));
    if (index < 0 || state.texts[index] !== filter.text) return { matchedCount: 0 } as never;
    state.texts[index] = update.$set.text; return { matchedCount: 1 } as never;
  });
};

test('segment edit request validates strict body, Unicode and positive revision', () => {
  const valid = updateTranscriptSegmentSchema.safeParse({ params: { id: projectId, segmentId: segmentIds[0]!.toString() }, body: { text: '  Tiếng Việt có dấu  ', expectedRevision: 3 }, query: {} });
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.body.text, 'Tiếng Việt có dấu');
  for (const body of [{ text: ' ', expectedRevision: 3 }, { text: 'ok', expectedRevision: 0 }, { text: 'ok', expectedRevision: 3, role: 'ADMIN' }]) {
    assert.equal(updateTranscriptSegmentSchema.safeParse({ params: { id: projectId, segmentId: segmentIds[0]!.toString() }, body, query: {} }).success, false);
  }
});

test('fullText rebuild preserves order and rejects inconsistent segments', () => {
  const segments = [{ sequence: 1, text: 'Xin' }, { sequence: 2, text: 'chào.' }];
  assert.equal(rebuildTranscriptFullText(segments, segmentIds[1]!.toString(), 'chào bạn.', segmentIds.map(String)), 'Xin chào bạn.');
  assert.throws(() => rebuildTranscriptFullText([{ sequence: 2, text: 'Sai' }], segmentIds[0]!.toString(), 'Mới', [segmentIds[0]!.toString()]), /không nhất quán/);
});

test('edit atomically updates segment, fullText and revision without changing timestamps', async (t) => {
  const state: State = { revision: 3, fullText: 'Xin chào.', texts: ['Xin', 'chào.'], project: true, activeJob: false, status: 'TRANSCRIBED' };
  install(t, state);
  const result = await updateTranscriptSegment(projectId, userId, segmentIds[1]!.toString(), 'chào bạn.', 3);
  assert.equal(result.transcript.revision, 4); assert.equal(result.transcript.fullText, 'Xin chào bạn.');
  assert.equal(result.segment.startTime, 1); assert.equal(result.segment.endTime, 2);
  assert.deepEqual(result.downstream, { requiresRevalidation: true, artifactsPreserved: true, regenerationStarted: false });
});

test('no-op does not increment revision or mark downstream for revalidation', async (t) => {
  const state: State = { revision: 3, fullText: 'Xin chào.', texts: ['Xin', 'chào.'], project: true, activeJob: false, status: 'TRANSCRIBED' };
  install(t, state);
  const result = await updateTranscriptSegment(projectId, userId, segmentIds[1]!.toString(), 'chào.', 3);
  assert.equal(result.transcript.revision, 3); assert.equal(result.downstream.requiresRevalidation, false);
});

test('CAS rejects the second request with the same expected revision', async (t) => {
  const state: State = { revision: 3, fullText: 'Xin chào.', texts: ['Xin', 'chào.'], project: true, activeJob: false, status: 'TRANSCRIBED' };
  install(t, state);
  await updateTranscriptSegment(projectId, userId, segmentIds[0]!.toString(), 'Chào', 3);
  await assert.rejects(() => updateTranscriptSegment(projectId, userId, segmentIds[1]!.toString(), 'bạn.', 3), (error: any) => error.code === 'TRANSCRIPT_REVISION_CONFLICT' && error.statusCode === 409);
  assert.equal(state.revision, 4); assert.deepEqual(state.texts, ['Chào', 'chào.']);
});

test('transaction rollback prevents partial transcript write', async (t) => {
  const state: State = { revision: 3, fullText: 'Xin chào.', texts: ['Xin', 'chào.'], project: true, activeJob: false, status: 'TRANSCRIBED' };
  install(t, state, true);
  await assert.rejects(() => updateTranscriptSegment(projectId, userId, segmentIds[0]!.toString(), 'Chào', 3), (error: any) => error.code === 'TRANSCRIPT_REVISION_CONFLICT');
  assert.deepEqual(state, { revision: 3, fullText: 'Xin chào.', texts: ['Xin', 'chào.'], project: true, activeJob: false, status: 'TRANSCRIBED' });
});

test('legacy, ownership and active transcription fail closed', async (t) => {
  for (const [state, code] of [
    [{ revision: undefined, fullText: 'Xin', texts: ['Xin', 'chào.'], project: true, activeJob: false, status: 'TRANSCRIBED' }, 'TRANSCRIPT_REVISION_UNAVAILABLE'],
    [{ revision: 1, fullText: 'Xin', texts: ['Xin', 'chào.'], project: false, activeJob: false, status: 'TRANSCRIBED' }, 'PROJECT_NOT_FOUND'],
    [{ revision: 1, fullText: 'Xin', texts: ['Xin', 'chào.'], project: true, activeJob: true, status: 'TRANSCRIBING' }, 'TRANSCRIPT_EDIT_NOT_ALLOWED'],
  ] as const) {
    await t.test(code, async (st) => {
      install(st, structuredClone(state) as State);
      await assert.rejects(() => updateTranscriptSegment(projectId, userId, segmentIds[0]!.toString(), 'Mới', 1), (error: any) => error.code === code);
    });
  }
});

test('missing transcript and segment return scoped not-found errors', async (t) => {
  await t.test('missing transcript', async (st) => {
    const state: State = { revision: 1, fullText: '', texts: [], project: true, activeJob: false, status: 'TRANSCRIBED', transcript: false };
    install(st, state);
    await assert.rejects(() => updateTranscriptSegment(projectId, userId, segmentIds[0]!.toString(), 'Mới', 1), (error: any) => error.code === 'TRANSCRIPT_NOT_FOUND' && error.statusCode === 404);
  });
  await t.test('segment outside transcript', async (st) => {
    const state: State = { revision: 1, fullText: 'Xin chào.', texts: ['Xin', 'chào.'], project: true, activeJob: false, status: 'TRANSCRIBED' };
    install(st, state);
    await assert.rejects(() => updateTranscriptSegment(projectId, userId, new Types.ObjectId().toString(), 'Mới', 1), (error: any) => error.code === 'TRANSCRIPT_SEGMENT_NOT_FOUND' && error.statusCode === 404);
  });
});
