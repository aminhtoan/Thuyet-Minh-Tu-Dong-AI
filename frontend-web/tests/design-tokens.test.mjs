import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Web and Mobile expose the canonical visual identity tokens', async () => {
  const [web, mobile] = await Promise.all([
    readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8'),
    readFile(new URL('../../frontend-mobile/src/theme/tokens.ts', import.meta.url), 'utf8'),
  ]);
  for (const value of ['#5850EC', '#794CFF', '#F8FAFC', '#0F172A', '#FFFFFF']) {
    assert.match(web.toUpperCase(), new RegExp(value));
    assert.match(mobile.toUpperCase(), new RegExp(value));
  }
});

test('shared controls preserve accessible minimum sizes and focus states', async () => {
  const [web, mobileButton, mobileInput] = await Promise.all([
    readFile(new URL('../src/styles/components.css', import.meta.url), 'utf8'),
    readFile(new URL('../../frontend-mobile/src/components/common/Button.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../frontend-mobile/src/components/common/Input.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(web, /button--sm \{ min-height: 2\.75rem/);
  assert.match(web, /focus-within/);
  assert.match(mobileButton, /minWidth: 44/);
  assert.match(mobileButton, /minHeight: 44/);
  assert.match(mobileInput, /controlFocused/);
});
