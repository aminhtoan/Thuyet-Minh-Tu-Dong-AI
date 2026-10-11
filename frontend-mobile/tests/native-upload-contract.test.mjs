import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createNativeUploadContract,
  isNativeUploadFileUri,
  invokeNativeUpload,
  MEDIA_UPLOAD_FIELD,
  safeUploadFileName,
} from '../src/features/projects/nativeUploadContract.mjs';
import { shouldRetryNativeUpload } from '../src/features/projects/nativeUploadRetry.mjs';

test('native multipart contract preserves field, MIME and Bearer authentication without a FormData body', () => {
  const contract = createNativeUploadContract({ token: 'test-access-token', mimeType: 'video/mp4' });
  assert.equal(MEDIA_UPLOAD_FIELD, 'file');
  assert.equal(contract.fieldName, 'file');
  assert.equal(contract.mimeType, 'video/mp4');
  assert.equal(contract.httpMethod, 'POST');
  assert.equal(contract.headers.Authorization, 'Bearer test-access-token');
  assert.equal('body' in contract, false);
  assert.equal('Content-Type' in contract.headers, false);
});

test('native multipart invokes the native upload factory with URI and multipart metadata', () => {
  const calls = [];
  const task = { uploadAsync: async () => ({ status: 200 }) };
  const result = invokeNativeUpload((...args) => { calls.push(args); return task; }, {
    url: 'http://server/api/projects/p1/media',
    fileUri: 'file:///app/cache/DocumentPicker/id/video.mp4',
    options: createNativeUploadContract({ token: 'token', mimeType: 'video/mp4' }),
    onProgress: () => undefined,
  });
  assert.equal(result, task);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 'file:///app/cache/DocumentPicker/id/video.mp4');
  assert.equal(calls[0][2].fieldName, 'file');
  assert.equal(calls[0][2].mimeType, 'video/mp4');
});

test('Android cache filename keeps a valid selected MP4 filename', () => {
  assert.equal(safeUploadFileName('camera-video.mp4'), 'camera-video.mp4');
  assert.equal(safeUploadFileName('folder/video.mp4'), 'folder_video.mp4');
});

test('native upload accepts a stable cache URI and rejects an unresolved Android content URI', () => {
  assert.equal(isNativeUploadFileUri('file:///data/user/0/host.exp.exponent/cache/mobile-uploads/video.mp4'), true);
  assert.equal(isNativeUploadFileUri('content://com.android.providers.media.documents/document/video%3A42'), false);
});

test('native upload refreshes only once after HTTP 401', () => {
  assert.equal(shouldRetryNativeUpload(401, true, true), true);
  assert.equal(shouldRetryNativeUpload(401, false, true), false);
  assert.equal(shouldRetryNativeUpload(401, true, false), false);
  assert.equal(shouldRetryNativeUpload(500, true, true), false);
});
