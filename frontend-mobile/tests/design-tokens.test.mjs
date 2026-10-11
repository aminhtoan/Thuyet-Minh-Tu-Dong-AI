import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Mobile and Web share the canonical brand palette', async () => {
  const [mobile, web] = await Promise.all([
    readFile(new URL('../src/theme/tokens.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../frontend-web/src/styles/tokens.css', import.meta.url), 'utf8'),
  ]);
  for (const value of ['#5850EC', '#794CFF', '#F8FAFC', '#0F172A', '#FFFFFF']) {
    assert.match(mobile.toUpperCase(), new RegExp(value));
    assert.match(web.toUpperCase(), new RegExp(value));
  }
});

test('Mobile shared controls retain touch targets and visual states', async () => {
  const [button, input, tokens] = await Promise.all([
    readFile(new URL('../src/components/common/Button.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/common/Input.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/theme/tokens.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(button, /minWidth: 44/);
  assert.match(button, /minHeight: 44/);
  assert.match(button, /primaryPressed/);
  assert.match(input, /controlFocused/);
  assert.match(tokens, /md: 10, lg: 12, xl: 20/);
});
