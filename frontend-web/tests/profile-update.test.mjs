import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createNameSaver, validateDisplayName, subscribeProfileUpdates, publishProfileUpdate } from '../src/features/auth/profileUpdate.mjs';

test('real authService updateName publishes returned user only after successful PATCH', async () => {
  const source = await readFile(new URL('../src/features/auth/authService.ts', import.meta.url), 'utf8');
  const exports = {}; let fail = false; let notifications = 0;
  const user = { id: 'own', fullName: 'Nguyễn Ánh', email: 'owner@example.test', role: 'CUSTOMER' };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: (name) => name.includes('profileUpdate') ? { publishProfileUpdate: (value) => { notifications++; assert.equal(value, user); } } : { session: {}, api: async (path, init) => {
      assert.equal(path, '/auth/me'); assert.equal(init.method, 'PATCH'); assert.deepEqual(JSON.parse(init.body), { fullName: 'Nguyễn Ánh' });
      if (fail) throw new Error('Server error'); return { user };
    } },
  });
  assert.equal(await exports.authService.updateName('Nguyễn Ánh'), user); assert.equal(notifications, 1);
  fail = true; await assert.rejects(exports.authService.updateName('Nguyễn Ánh')); assert.equal(notifications, 1);
});
test('display name validation trims and accepts Vietnamese; 2–100 matches server', () => {
  for (const name of ['', '   ', 'A', 'x'.repeat(101)]) assert.ok(validateDisplayName(name));
  for (const name of [' Nguyễn Ánh ', 'AB', 'x'.repeat(100)]) assert.equal(validateDisplayName(name), null);
});
test('save trims payload and suppresses concurrent requests', async () => {
  let calls = 0; let finish;
  const save = createNameSaver((name) => { calls++; assert.equal(name, 'Nguyễn Ánh'); return new Promise((resolve) => { finish = resolve; }); });
  const first = save(' Nguyễn Ánh '); assert.equal(await save('Duplicate'), null); assert.equal(calls, 1);
  finish({ fullName: 'Nguyễn Ánh' }); assert.deepEqual(await first, { fullName: 'Nguyễn Ánh' });
});
test('invalid name never calls API; failed save releases lock without publishing success', async () => {
  let calls = 0; const old = { fullName: 'Tên cũ' };
  const save = createNameSaver(async () => { calls++; throw new Error('Không thể lưu'); });
  await assert.rejects(save(' ')); assert.equal(calls, 0);
  await assert.rejects(save('Tên mới')); await assert.rejects(save('Thử lại')); assert.equal(calls, 2); assert.equal(old.fullName, 'Tên cũ');
});
test('profile notification updates listeners and unsubscribe prevents stale updates', () => {
  let received; const unsubscribe = subscribeProfileUpdates((user) => { received = user; });
  const user = { fullName: 'Tên mới', email: 'real@example.test' }; publishProfileUpdate(user); assert.equal(received, user);
  unsubscribe(); publishProfileUpdate({ fullName: 'Other' }); assert.equal(received, user);
});
test('Account cancel is local, save updates parent and service publishes only after API success', async () => {
  const source = await readFile(new URL('../src/pages/SettingsPlaceholder.tsx', import.meta.url), 'utf8');
  const service = await readFile(new URL('../src/features/auth/authService.ts', import.meta.url), 'utf8');
  const header = await readFile(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');
  assert.match(source, /setEditing\(false\); setDraft\(user.fullName\); setSaveError\(null\)/);
  assert.match(source, /onUpdated\?\.\(updated\)/); assert.match(source, /savingLock.current/);
  assert.match(service, /await api.*method: 'PATCH'.*JSON.stringify\(\{ fullName \}\).*publishProfileUpdate\(data.user\)/);
  assert.match(header, /subscribeProfileUpdates/); assert.match(header, /active && !updated/);
});
