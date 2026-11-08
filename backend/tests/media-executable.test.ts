import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMediaExecutable } from '../src/utils/media-executable.js';

test('configured valid binary wins, invalid config falls back only to verified PATH', async () => {
  const calls: string[] = [];
  assert.equal(await resolveMediaExecutable('ffmpeg', ' valid-config ', async path => { calls.push(path); return true; }), 'valid-config');
  assert.deepEqual(calls, ['valid-config']);
  calls.length = 0;
  assert.equal(await resolveMediaExecutable('ffprobe', 'missing-config', async path => { calls.push(path); return path === 'ffprobe'; }), 'ffprobe');
  assert.deepEqual(calls, ['missing-config', 'ffprobe']);
});
test('missing config uses PATH; unavailable config and PATH fail with safe explicit code', async () => {
  assert.equal(await resolveMediaExecutable('ffmpeg', undefined, async path => path === 'ffmpeg'), 'ffmpeg');
  for (const kind of ['ffmpeg', 'ffprobe'] as const) {
    await assert.rejects(resolveMediaExecutable(kind, 'missing', async () => false), { message: kind.toUpperCase() + '_NOT_AVAILABLE' });
  }
});
