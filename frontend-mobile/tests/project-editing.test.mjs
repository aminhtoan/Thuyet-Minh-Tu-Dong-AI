import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeUpdatedProject, runProjectSaveOnce, validateProjectEdit } from '../src/features/projects/projectEditing.mjs';

const supported = ['vi', 'en', 'ja', 'ko'];

test('project editing normalizes values accepted by the backend contract', () => {
  assert.deepEqual(validateProjectEdit({ name: '  Dự án mới  ', description: '  Mô tả  ', sourceLanguage: 'vi' }, supported), {
    valid: true,
    value: { name: 'Dự án mới', description: 'Mô tả', sourceLanguage: 'vi' },
  });
});

test('project editing rejects missing names, oversized fields and unsupported languages', () => {
  assert.equal(validateProjectEdit({ name: ' ', description: '', sourceLanguage: 'vi' }, supported).valid, false);
  assert.equal(validateProjectEdit({ name: 'a'.repeat(151), description: '', sourceLanguage: 'vi' }, supported).valid, false);
  assert.equal(validateProjectEdit({ name: 'Hợp lệ', description: 'a'.repeat(1001), sourceLanguage: 'vi' }, supported).valid, false);
  assert.equal(validateProjectEdit({ name: 'Hợp lệ', description: '', sourceLanguage: 'xx' }, supported).valid, false);
});

test('project save gate prevents concurrent duplicate requests and releases after completion', async () => {
  const lock = { current: false };
  let release;
  let calls = 0;
  const pending = runProjectSaveOnce(lock, async () => { calls += 1; await new Promise((resolve) => { release = resolve; }); return 'saved'; });
  const duplicate = await runProjectSaveOnce(lock, async () => { calls += 1; });
  assert.deepEqual(duplicate, { started: false });
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await pending, { started: true, value: 'saved' });
  assert.equal((await runProjectSaveOnce(lock, async () => 'saved-again')).started, true);
});

test('updated project replaces the matching cache entry without creating a duplicate', () => {
  const existing = [{ id: 'one', name: 'Tên cũ', status: 'UPLOADED' }, { id: 'two', name: 'Khác', status: 'DRAFT' }];
  const updated = { id: 'one', name: 'Tên mới', status: 'UPLOADED' };
  const merged = mergeUpdatedProject(existing, updated);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0], updated);
  assert.equal(merged[0].status, 'UPLOADED');
});
