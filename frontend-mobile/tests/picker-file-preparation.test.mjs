import assert from 'node:assert/strict';
import test from 'node:test';
import { PICKER_FILE_UNREADABLE_MESSAGE, preparePickerFile } from '../src/features/projects/pickerFilePreparation.mjs';

function fakeFileSystem(overrides = {}) {
  const calls = { copy: [], deleted: [], directories: [] };
  return {
    calls,
    cacheDirectory: 'file:///app/cache/',
    getInfo: async () => ({ exists: true, isDirectory: false }),
    makeDirectory: async (uri) => { calls.directories.push(uri); },
    materialize: async (from, to) => { calls.copy.push({ from, to }); },
    delete: async (uri) => { calls.deleted.push(uri); },
    ...overrides,
  };
}

test('uses a readable DocumentPicker cache file directly without copyAsync', async () => {
  const fs = fakeFileSystem();
  const uri = 'file:///app/cache/DocumentPicker/id/camera-video.mp4';
  const prepared = await preparePickerFile({ uri, fileName: 'camera-video.mp4', projectId: 'p1' }, fs);
  assert.equal(prepared.uploadUri, uri);
  assert.equal(prepared.copied, false);
  assert.deepEqual(fs.calls.copy, []);
});

test('rejects a missing or unreadable picker URI with the reselect message', async () => {
  const fs = fakeFileSystem({ getInfo: async () => ({ exists: false, isDirectory: false }) });
  await assert.rejects(
    preparePickerFile({ uri: 'file:///app/cache/DocumentPicker/missing.mp4', fileName: 'missing.mp4', projectId: 'p1' }, fs),
    { message: PICKER_FILE_UNREADABLE_MESSAGE },
  );
});

test('does not reject a valid picker URI because an optional Base64 read probe is unsupported', async () => {
  const fs = fakeFileSystem({ readProbe: async () => { throw new Error('Unsupported read options'); } });
  const prepared = await preparePickerFile(
    { uri: 'file:///app/cache/DocumentPicker/unreadable.mp4', fileName: 'unreadable.mp4', projectId: 'p1' },
    fs,
  );
  assert.equal(prepared.copied, false);
  assert.deepEqual(fs.calls.copy, []);
});

test('keeps a direct picker cache file after failure so retry can reuse it', async () => {
  const fs = fakeFileSystem();
  const uri = 'file:///app/cache/DocumentPicker/id/retry.mp4';
  const prepared = await preparePickerFile({ uri, fileName: 'retry.mp4', projectId: 'p1' }, fs);
  await prepared.cleanup(false);
  assert.deepEqual(fs.calls.deleted, []);
  await prepared.cleanup(true);
  assert.deepEqual(fs.calls.deleted, [uri]);
});

test('materializes a readable non-file URI into project-owned cache', async () => {
  const fs = fakeFileSystem();
  const source = 'content://provider/video/42';
  const prepared = await preparePickerFile({ uri: source, fileName: 'selected.mp4', projectId: 'p1' }, fs);
  assert.equal(prepared.uploadUri, 'file:///app/cache/mobile-uploads/p1/selected.mp4');
  assert.deepEqual(fs.calls.copy, [{ from: source, to: prepared.uploadUri }]);
  await prepared.cleanup(false);
  assert.equal(fs.calls.deleted.at(-1), 'file:///app/cache/mobile-uploads/p1/');
});

test('materializes an outside-app-cache file URI before native upload', async () => {
  const fs = fakeFileSystem();
  const source = 'file:///expo-host/cache/DocumentPicker/id/video.mp4';
  const prepared = await preparePickerFile({ uri: source, fileName: 'video.mp4', projectId: 'p1' }, fs);
  assert.equal(prepared.uploadUri, 'file:///app/cache/mobile-uploads/p1/video.mp4');
  assert.equal(prepared.copied, true);
  assert.deepEqual(fs.calls.copy, [{ from: source, to: prepared.uploadUri }]);
});

test('reports failed outside-cache materialization without retrying the same source', async () => {
  let attempts = 0;
  const fs = fakeFileSystem({ materialize: async () => { attempts += 1; throw new Error('Location is not readable'); } });
  await assert.rejects(
    preparePickerFile({ uri: 'file:///expo-host/cache/DocumentPicker/id/video.mp4', fileName: 'video.mp4', projectId: 'p1' }, fs),
    /không có quyền đọc tệp/i,
  );
  assert.equal(attempts, 1);
});

test('rejects materialized output whose size differs from the source', async () => {
  let infoCalls = 0;
  const fs = fakeFileSystem({
    getInfo: async () => {
      infoCalls += 1;
      return { exists: true, isDirectory: false, size: infoCalls === 1 ? 100 : 90 };
    },
  });
  await assert.rejects(
    preparePickerFile({ uri: 'file:///expo-host/cache/DocumentPicker/id/video.mp4', fileName: 'video.mp4', projectId: 'p1' }, fs),
    /không thể kiểm tra tệp/i,
  );
});

test('retry detects when a previously valid cache source has become stale', async () => {
  let exists = true;
  const fs = fakeFileSystem({ getInfo: async () => ({ exists, isDirectory: false }) });
  const input = { uri: 'file:///app/cache/DocumentPicker/id/stale.mp4', fileName: 'stale.mp4', projectId: 'p1' };
  await preparePickerFile(input, fs);
  exists = false;
  await assert.rejects(preparePickerFile(input, fs), { message: PICKER_FILE_UNREADABLE_MESSAGE });
});
