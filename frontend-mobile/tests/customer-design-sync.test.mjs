import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkCustomerDesign } from '../../scripts/customer-design-sync.mjs';

test('native and Web adapters remain synchronized without Metro external imports', checkCustomerDesign);
test('native tokens expose font/brand/component rules and preserve platform overrides', async () => {
  const t = await readFile(new URL('../src/theme/tokens.ts', import.meta.url), 'utf8');
  assert.match(t, /BeVietnamPro-Regular/); assert.match(t, /Thuyết minh bảo tàng/);
  assert.match(t, /"navy": "#111C32"/); assert.match(t, /"sidebar": "#FAF9FF"/);
  assert.match(t, /componentRules/); assert.doesNotMatch(t, /\bimport\b/);
  const root = await readFile(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');
  assert.match(root, /useFonts/); assert.match(root, /!fontsLoaded && !fontError/);
  assert.match(root, /assets\/fonts\/be-vietnam-pro\/regular.ttf/);
});
