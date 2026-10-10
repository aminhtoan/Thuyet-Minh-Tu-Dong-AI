import assert from 'node:assert/strict';
import test from 'node:test';
import { TranscriptCancelledError, confirmTranscriptRequest, deriveTranscriptStage, mapTranscriptDto, runTranscriptRequestOnce, transcriptErrorMessage } from '../src/features/transcript/transcriptWorkflow.mjs';

const dto = { id: 'transcript-1', projectId: 'project-1', language: 'vi', fullText: 'Xin chào', createdAt: '2026-10-10', updatedAt: '2026-10-10' };

test('transcript maps real segments and preserves optional timestamps', () => {
  const mapped = mapTranscriptDto({ ...dto, segments: [{ id: 'segment-1', index: 0, startTime: 0, endTime: 1.5, text: 'Xin chào' }, { index: 1, text: 'Thiếu mốc thời gian' }] });
  assert.deepEqual(mapped.segments[0], { id: 'segment-1', sequence: 0, startTime: 0, endTime: 1.5, text: 'Xin chào' });
  assert.deepEqual(mapped.segments[1], { id: 'transcript-1:1', sequence: 1, startTime: undefined, endTime: undefined, text: 'Thiếu mốc thời gian' });
  assert.deepEqual(mapTranscriptDto(dto).segments, []);
});

test('confirmation cancellation never starts a paid request', async () => {
  let requests = 0;
  await assert.rejects(confirmTranscriptRequest(async () => false, async () => { requests += 1; }), TranscriptCancelledError);
  assert.equal(requests, 0);
  assert.equal(transcriptErrorMessage(new TranscriptCancelledError()), null);
});

test('transcript request gate prevents double submission and permits retry', async () => {
  const lock = { current: false }; let release; let calls = 0;
  const first = runTranscriptRequestOnce(lock, async () => { calls += 1; await new Promise((resolve) => { release = resolve; }); return 'TRANSCRIBED'; });
  assert.deepEqual(await runTranscriptRequestOnce(lock, async () => { calls += 1; }), { started: false });
  release(); assert.deepEqual(await first, { started: true, value: 'TRANSCRIBED' }); assert.equal(calls, 1);
  assert.equal((await runTranscriptRequestOnce(lock, async () => 'retry')).started, true);
});

test('transcript failures have safe Vietnamese messages', () => {
  assert.match(transcriptErrorMessage({ status: 401 }) ?? '', /Phiên đăng nhập/);
  assert.match(transcriptErrorMessage({ code: 'TRANSCRIPTION_ALREADY_RUNNING' }) ?? '', /đang được chuyển/);
  assert.match(transcriptErrorMessage(new TypeError('Network request failed')) ?? '', /Không thể kết nối/);
  const timeout = new Error(); timeout.name = 'TranscriptTimeoutError';
  assert.match(transcriptErrorMessage(timeout) ?? '', /hết thời gian chờ/);
  assert.equal(transcriptErrorMessage({ code: 'STT_PROVIDER_ERROR', message: 'Không thể chuyển giọng nói thành văn bản.' }), 'Không thể chuyển giọng nói thành văn bản.');
});

test('transcript status transitions represent uploaded, processing, success and failure states', () => {
  assert.equal(deriveTranscriptStage('UPLOADED', 'NOT_STARTED', false), 'UPLOADED');
  assert.equal(deriveTranscriptStage('UPLOADED', 'GENERATING', false), 'TRANSCRIBING');
  assert.equal(deriveTranscriptStage('TRANSCRIBING', 'NOT_STARTED', false), 'TRANSCRIBING');
  assert.equal(deriveTranscriptStage('TRANSCRIBED', 'SAVED', true), 'TRANSCRIBED');
  assert.equal(deriveTranscriptStage('FAILED', 'FAILED', false), 'FAILED');
});
