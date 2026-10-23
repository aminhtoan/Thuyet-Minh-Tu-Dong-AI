import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { checkCustomerDesign } from '../../scripts/customer-design-sync.mjs';

test('both Customer design adapters match the canonical configuration', checkCustomerDesign);
test('generated Web theme is scoped away from Public Museum', async () => {
  const css = await readFile(new URL('../src/styles/customer-tokens.generated.css', import.meta.url), 'utf8');
  assert.match(css, /:where\(\.app-shell, \.login-page, \.register-page, \.auth-layout\)/);
  assert.doesNotMatch(css, /:root|\.museum/);
  const global = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(global, /@import '.\/customer-tokens.generated.css'/);
});
test('native fonts retain identical bundled assets and license', async () => {
  for (const name of ['regular.ttf', 'semibold.ttf', 'bold.ttf', 'OFL.txt']) {
    const hash = async relative => createHash('sha256').update(await readFile(new URL(relative, import.meta.url))).digest('hex');
    assert.equal(await hash(`../src/assets/fonts/be-vietnam-pro/${name}`), await hash(`../../frontend-mobile/assets/fonts/be-vietnam-pro/${name}`));
  }
});
test('screen correspondence lists real source files, not invented routes', async () => {
  const rows = JSON.parse(await readFile(new URL('../../design/customer/screens.json', import.meta.url), 'utf8'));
  assert.equal(rows.length, 12);
  for (const row of rows) for (const platform of ['web', 'mobile']) await access(new URL('../../' + row[platform], import.meta.url));
  assert.equal(rows.at(-1).parity, 'PARTIAL-history-is-not-library');
});
