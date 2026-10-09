import assert from 'node:assert/strict';
import test from 'node:test';
import { PICKER_STAGE_ACCESS_MESSAGE, requiresFreshPickerSelection, stageFreshPickerAsset } from '../src/features/projects/pickerStaging.mjs';

function dependencies(overrides = {}) {
  const calls = { copied: [], deleted: [] };
  return {
    calls,
    createDirectory: () => 'file:///app/cache/picker-uploads/fresh/',
    destination: (directory, name) => `${directory}${name}`,
    scheme: (uri) => uri.split(':')[0],
    makeDirectory: async () => undefined,
    copyExact: async (from, to) => { calls.copied.push({ from, to }); },
    getInfo: async () => ({ exists: true, isDirectory: false, size: 42 }),
    delete: async (uri) => { calls.deleted.push(uri); },
    ...overrides,
  };
}

const freshAsset = { uri: 'content://provider/document/video-1', name: 'video.mp4', size: 42, mimeType: 'video/mp4' };

test('fresh picker URI is copied exactly once into app-controlled cache', async () => {
  const deps = dependencies();
  const staged = await stageFreshPickerAsset(freshAsset, deps);
  assert.equal(staged.asset.uri, 'file:///app/cache/picker-uploads/fresh/video.mp4');
  assert.equal(staged.asset.name, 'video.mp4');
  assert.deepEqual(deps.calls.copied, [{ from: freshAsset.uri, to: staged.asset.uri }]);
});

test('permission denied during fresh staging requires a new picker selection', async () => {
  const deps = dependencies({ copyExact: async () => { throw new Error("Missing 'READ' permission for accessing the file"); } });
  await assert.rejects(stageFreshPickerAsset(freshAsset, deps), { message: PICKER_STAGE_ACCESS_MESSAGE });
  assert.equal(requiresFreshPickerSelection(PICKER_STAGE_ACCESS_MESSAGE), true);
  assert.equal(deps.calls.deleted.length, 1);
});

test('stale picker URI is not retained as an uploadable asset', async () => {
  const deps = dependencies({ copyExact: async () => { throw new Error('No such file'); } });
  await assert.rejects(stageFreshPickerAsset(freshAsset, deps), /chọn lại tệp/i);
});

test('staged destination must exist and preserve source size', async () => {
  const missing = dependencies({ getInfo: async () => ({ exists: false, isDirectory: false }) });
  await assert.rejects(stageFreshPickerAsset(freshAsset, missing), /chuẩn bị tệp/i);
  const wrongSize = dependencies({ getInfo: async () => ({ exists: true, isDirectory: false, size: 41 }) });
  await assert.rejects(stageFreshPickerAsset(freshAsset, wrongSize), /chuẩn bị tệp/i);
});

test('staged picker cache remains available until explicit cleanup', async () => {
  const deps = dependencies();
  const staged = await stageFreshPickerAsset(freshAsset, deps);
  assert.deepEqual(deps.calls.deleted, []);
  await staged.cleanup();
  assert.deepEqual(deps.calls.deleted, ['file:///app/cache/picker-uploads/fresh/']);
});
