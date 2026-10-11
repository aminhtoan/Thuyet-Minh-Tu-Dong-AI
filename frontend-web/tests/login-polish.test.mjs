import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getLoginErrorMessage } from '../src/features/auth/loginError.mjs';

test('login errors distinguish credentials, validation, network and server failures safely', () => {
  assert.equal(getLoginErrorMessage({ status: 401, code: 'INVALID_CREDENTIALS' }), 'Email hoặc mật khẩu không đúng.');
  assert.match(getLoginErrorMessage({ status: 400, code: 'VALIDATION_ERROR' }), /không hợp lệ/);
  assert.match(getLoginErrorMessage(new TypeError('fetch failed')), /Không thể kết nối/);
  assert.match(getLoginErrorMessage({ status: 503, code: 'INTERNAL_ERROR' }), /Máy chủ đang gặp sự cố/);
  assert.doesNotMatch(getLoginErrorMessage(new Error('secret detail')), /secret detail/);
});

test('login-only wrapper protects Register from visual overrides', async () => {
  const login = await readFile(new URL('../src/pages/LoginPlaceholder.tsx', import.meta.url), 'utf8');
  const register = await readFile(new URL('../src/pages/RegisterPlaceholder.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/styles/auth.css', import.meta.url), 'utf8');
  assert.match(login, /className="login-page"/);
  assert.doesNotMatch(register, /className="login-page"/);
  assert.match(css, /\.login-page \.auth-layout/);
  assert.match(css, /100svh/);
});

test('login retains duplicate-submit and password visibility control', async () => {
  const source = await readFile(new URL('../src/features/auth/LoginForm.tsx', import.meta.url), 'utf8');
  assert.match(source, /submitLock\.current/);
  assert.match(source, /<PasswordField/);
});
