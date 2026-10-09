import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveUploadMimeType } from '../src/features/projects/uploadMetadata.mjs';

test('Android picker MIME fallback is normalized to backend-supported media MIME', () => {
  assert.equal(resolveUploadMimeType('recording.MP3'), 'audio/mpeg');
  assert.equal(resolveUploadMimeType('voice.m4a'), 'audio/mp4');
  assert.equal(resolveUploadMimeType('clip.mov'), 'video/quicktime');
});

test('unknown media extension remains safely unsupported', () => {
  assert.equal(resolveUploadMimeType('archive.bin'), 'application/octet-stream');
});
