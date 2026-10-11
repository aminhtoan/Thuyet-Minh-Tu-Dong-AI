import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Customer Web sidebar uses the approved navy identity without changing navigation', async () => {
  const [tokens, css, sidebar] = await Promise.all([
    readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles/shell.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(tokens, /--color-sidebar:\s*#111c32/);
  assert.match(css, /\.sidebar__link--active[^}]*color:\s*#fff/);
  assert.match(css, /\.sidebar__link:focus-visible/);
  assert.match(css, /\.sidebar__bottom[^}]*border-top/);
  for (const route of ['/dashboard', '/projects', '/projects/new', '/history', '/settings']) assert.match(sidebar, new RegExp(route.replace('/', '\\/')));
});
