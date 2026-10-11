import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateLoginValues, validateRegisterValues } from '../src/features/auth/authValidation.mjs';
import { confirmationMessages as webConfirmations } from '../src/localization/confirmationMessages.mjs';
import { navigationLabels as webNavigation } from '../src/localization/navigationLabels.mjs';
import { requireConfirmation } from '../src/utils/confirmationGuard.mjs';
import { validateLoginValues as validateMobileLogin, validateRegisterValues as validateMobileRegister } from '../../frontend-mobile/src/features/auth/authValidation.mjs';
import { confirmationMessages as mobileConfirmations } from '../../frontend-mobile/src/localization/confirmationMessages.mjs';
import { navigationLabels as mobileNavigation } from '../../frontend-mobile/src/localization/navigationLabels.mjs';

const expectedNavigation = {
  dashboard: 'Bảng điều khiển',
  projects: 'Dự án của tôi',
  create: 'Tạo thuyết minh',
  history: 'Lịch sử',
  account: 'Tài khoản',
};

test('Web and Mobile expose the same Vietnamese navigation labels', () => {
  assert.deepEqual(webNavigation, expectedNavigation);
  assert.deepEqual(mobileNavigation, expectedNavigation);
});

test('Web and Mobile keep account destinations unambiguous', async () => {
  const [sidebar, tabs, settings] = await Promise.all([
    readFile(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../frontend-mobile/src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../frontend-mobile/src/screens/SettingsScreen.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(sidebar, /to: '\/settings'/);
  assert.match(tabs, /name="settings" options=\{\{ href: null \}\}/);
  assert.match(settings, /<AccountScreen \/>/);
});

test('cancelling a paid-action confirmation prevents the operation', async () => {
  let operations = 0;
  await assert.rejects(async () => {
    requireConfirmation(() => false, webConfirmations.transcript);
    operations += 1;
  }, (error) => error?.name === 'AbortError');
  assert.equal(operations, 0);
  assert.equal(webConfirmations.transcript, mobileConfirmations.transcript);
  assert.equal(webConfirmations.narration, mobileConfirmations.narration);
});

test('authentication form validation stays in parity', () => {
  const invalidLogin = { email: 'khong-hop-le', password: 'ngan' };
  const invalidRegister = { fullName: 'A', email: 'khong-hop-le', password: 'matkhau', confirmPassword: 'khac' };
  assert.deepEqual(validateLoginValues(invalidLogin), validateMobileLogin(invalidLogin));
  assert.deepEqual(validateRegisterValues(invalidRegister), validateMobileRegister(invalidRegister));
  assert.deepEqual(validateRegisterValues({ fullName: 'Nguyễn An', email: 'an@example.com', password: 'Matkhau123', confirmPassword: 'Matkhau123' }), {});
});

test('auth forms retain synchronous duplicate-submit locks', async () => {
  const files = await Promise.all([
    readFile(new URL('../src/features/auth/LoginForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/auth/RegisterForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../frontend-mobile/src/features/auth/LoginForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../frontend-mobile/src/features/auth/RegisterForm.tsx', import.meta.url), 'utf8'),
  ]);
  for (const source of files) {
    assert.match(source, /submitLock\.current/);
    assert.match(source, /if \(submitLock\.current\) return/);
  }
});
