import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateLoginValues, validateRegisterValues } from '../src/features/auth/authValidation.mjs';
import { confirmationMessages as mobileConfirmations } from '../src/localization/confirmationMessages.mjs';
import { navigationLabels as mobileNavigation } from '../src/localization/navigationLabels.mjs';
import { validateLoginValues as validateWebLogin, validateRegisterValues as validateWebRegister } from '../../frontend-web/src/features/auth/authValidation.mjs';
import { confirmationMessages as webConfirmations } from '../../frontend-web/src/localization/confirmationMessages.mjs';
import { navigationLabels as webNavigation } from '../../frontend-web/src/localization/navigationLabels.mjs';

test('Mobile navigation labels match Web and include the five agreed destinations', () => {
  assert.deepEqual(mobileNavigation, webNavigation);
  assert.deepEqual(Object.values(mobileNavigation), ['Bảng điều khiển', 'Dự án của tôi', 'Tạo thuyết minh', 'Lịch sử', 'Tài khoản']);
});

test('legacy Settings renders Account while only Account is visible in tabs', async () => {
  const [tabs, settings] = await Promise.all([
    readFile(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/screens/SettingsScreen.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(tabs, /name="settings" options=\{\{ href: null \}\}/);
  assert.match(tabs, /name="account"/);
  assert.match(settings, /<AccountScreen \/>/);
});

test('paid-action confirmation copy stays in parity', () => {
  assert.equal(mobileConfirmations.transcript, webConfirmations.transcript);
  assert.equal(mobileConfirmations.translation('en'), webConfirmations.translation('en'));
  assert.equal(mobileConfirmations.narration, webConfirmations.narration);
  assert.equal(mobileConfirmations.logout, webConfirmations.logout);
});

test('login and registration validation stays in parity', () => {
  const login = { email: 'sai', password: '123' };
  const registration = { fullName: '', email: 'sai', password: 'matkhau', confirmPassword: 'khac' };
  assert.deepEqual(validateLoginValues(login), validateWebLogin(login));
  assert.deepEqual(validateRegisterValues(registration), validateWebRegister(registration));
});

test('mobile auth forms keep duplicate-submit protection', async () => {
  const files = await Promise.all([
    readFile(new URL('../src/features/auth/LoginForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/auth/RegisterForm.tsx', import.meta.url), 'utf8'),
  ]);
  for (const source of files) {
    assert.match(source, /submitLock\.current/);
    assert.match(source, /if \(submitLock\.current\) return/);
  }
});
