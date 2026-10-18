import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { activeTranscriptSegment, seekSourceMedia, createSourceMediaLoader, MAX_AUTOLOAD_BLOB_SIZE, scheduleSourceMediaAutoLoad, sourceMediaError, sourceMediaInitialState } from '../src/features/transcript/sourcePlayback.mjs';
test('active grouped segment follows time with gaps and exclusive end', () => {
  const segments = [{ id: 'a', startTime: 0.1, endTime: 1 }, { id: 'b', startTime: 2, endTime: 3 }];
  assert.equal(activeTranscriptSegment(segments, 0.2), 'a'); assert.equal(activeTranscriptSegment(segments, 1), null); assert.equal(activeTranscriptSegment(segments, 2), 'b'); assert.equal(activeTranscriptSegment(segments, NaN), null);
});
test('seek requires loaded metadata, plays once and uses exact timestamp', async () => {
  let calls = 0; const player = { readyState: 1, duration: 5, currentTime: 0, async play() { calls++; } };
  assert.equal(await seekSourceMedia(player, 1.234), true); assert.equal(player.currentTime, 1.234); assert.equal(calls, 1);
  for (const time of [-1, NaN, 5, 8]) assert.equal(await seekSourceMedia(player, time), false);
  assert.equal(await seekSourceMedia(null, 1), false); player.readyState = 0; assert.equal(await seekSourceMedia(player, 1), false); assert.equal(calls, 1);
});
test('blocked browser playback rejection propagates for Vietnamese feedback', async () => { await assert.rejects(seekSourceMedia({ readyState: 1, duration: 5, async play() { throw new Error('Blocked'); } }, 1)); });
test('audio/video blob load is single flight and object URL revoked exactly once', async () => {
  for (const type of ['audio/mpeg', 'video/mp4']) {
    let calls = 0; let revoked = 0;
    const loader = createSourceMediaLoader(async () => { calls++; return new Blob(['fixture'], { type }); }, () => 'blob:local', url => { assert.equal(url, 'blob:local'); revoked++; });
    assert.deepEqual(await Promise.all([loader.load(), loader.load()]), ['blob:local', 'blob:local']); assert.equal(calls, 1); assert.equal(await loader.load(), 'blob:local'); loader.dispose(); loader.dispose(); assert.equal(revoked, 1);
  }
});
test('unmount ignores late blob; failed load may retry without leaked URLs', async () => {
  let finish; let created = 0;
  const loader = createSourceMediaLoader(() => new Promise(r => { finish = r; }), () => { created++; return 'blob:late'; }, () => {});
  const pending = loader.load(); loader.dispose(); finish(new Blob(['fixture'], { type: 'audio/mpeg' })); assert.equal(await pending, null); assert.equal(created, 0);
  let calls = 0; const retry = createSourceMediaLoader(async () => { if (++calls === 1) throw new Error('Network'); return new Blob(['fixture'], { type: 'audio/mpeg' }); }, () => 'blob:retry', () => {});
  await assert.rejects(retry.load()); assert.equal(await retry.load(), 'blob:retry'); retry.dispose();
});
test('unsupported MIME and error status are handled safely', async () => {
  const loader = createSourceMediaLoader(async () => new Blob(['bad'], { type: 'text/html' }), () => { throw new Error('Should not create'); }, () => {});
  await assert.rejects(loader.load(), e => e.status === 415);
  assert.match(sourceMediaError({ status: 401 }), /đăng nhập/); assert.match(sourceMediaError({ status: 403 }), /quyền/); assert.match(sourceMediaError({ status: 404 }), /Không tìm thấy/); assert.match(sourceMediaError({ status: 415 }), /MP3 hoặc MP4/);
});
test('player distinguishes verified loading, empty, error, unknown and oversized media', () => {
  assert.deepEqual(sourceMediaInitialState('READY', 'AUDIO', 1024), { status: 'LOADING', error: null });
  assert.deepEqual(sourceMediaInitialState('READY', 'VIDEO', MAX_AUTOLOAD_BLOB_SIZE), { status: 'LOADING', error: null });
  assert.equal(sourceMediaInitialState('EMPTY', undefined, undefined).status, 'EMPTY');
  assert.equal(sourceMediaInitialState('ERROR', undefined, undefined).status, 'ERROR');
  assert.equal(sourceMediaInitialState('UNKNOWN', 'AUDIO', 1024).status, 'UNKNOWN');
  assert.equal(sourceMediaInitialState('READY', undefined, 1024).status, 'UNKNOWN');
  assert.equal(sourceMediaInitialState('READY', 'AUDIO', undefined).status, 'UNKNOWN');
  const oversized = sourceMediaInitialState('READY', 'AUDIO', MAX_AUTOLOAD_BLOB_SIZE + 1);
  assert.equal(oversized.status, 'ERROR'); assert.match(oversized.error, /phát trực tuyến/);
});
test('StrictMode probe aborts before auto-load while live mount starts exactly once', async () => {
  let calls = 0;
  const probe = new AbortController(); scheduleSourceMediaAutoLoad(probe.signal, () => { calls++; }); probe.abort();
  const live = new AbortController(); scheduleSourceMediaAutoLoad(live.signal, () => { calls++; });
  await Promise.resolve();
  assert.equal(calls, 1);
});
test('player auto-loads authenticated blob, has bounded lifecycle, no autoplay or AI; page seek wired', async () => {
  const source = await readFile(new URL('../src/features/transcript/SourceMediaPlayer.tsx', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/pages/TranscriptPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /scheduleSourceMediaAutoLoad/); assert.match(source, /apiBlob/); assert.match(source, /AbortSignal\.any/); assert.match(source, /AbortSignal\.timeout/);
  assert.match(source, /controller\.abort\(\); current\.dispose\(\)/); assert.match(source, /URL\.revokeObjectURL/); assert.match(source, /Thử tải lại/);
  assert.match(source, /<video/); assert.match(source, /<audio/); assert.match(source, /preload="metadata"/); assert.doesNotMatch(source, /autoPlay|generateTranscript|gemini|accessToken|refreshToken|Tải phương tiện để phát/);
  assert.doesNotMatch(source, /Phương tiện được tải qua phiên đăng nhập bảo vệ và chỉ phát khi bạn nhấn Phát\./);
  assert.match(page, /key=\{mediaIdentity\}/); assert.match(page, /onSeek=|canSeek=\{mediaReady\}/); assert.match(page, /active=\{activeSegment === segment.id\}/);
});
