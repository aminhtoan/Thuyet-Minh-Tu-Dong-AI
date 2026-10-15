import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [source, css] = await Promise.all([
  readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/dashboard.css', import.meta.url), 'utf8'),
]);

test('Hero remains compact and keeps the existing illustration and creation route', () => {
  assert.match(css, /\.dashboard \.dashboard-hero \{[\s\S]*?grid-template-columns: minmax\(0, 1\.35fr\) minmax\(280px, \.65fr\);[\s\S]*?min-height: 208px;/);
  assert.match(css, /\.dashboard \.hero-art \{[\s\S]*?height: 168px;/);
  assert.match(source, /className="hero-art" aria-hidden="true"/);
  assert.match(source, /className="button button--primary button--md hero-cta" to="\/projects\/new"/);
});

test('Quick Actions keep all supported routes and semantic navigation', () => {
  assert.match(source, /<nav className="quick-actions" aria-label="Lối tắt sáng tạo">/);
  assert.equal((source.match(/route: '\/projects(?:\/new)?'/g) ?? []).length, 4);
  assert.match(source, /title: 'Tạo thuyết minh'.*route: '\/projects\/new'/);
  for (const title of ['Bản ghi', 'Bản dịch', 'Giọng đọc']) {
    assert.match(source, new RegExp(`title: '${title}'.*route: '/projects'`));
  }
});

test('Quick Action layout responds to Dashboard content width', () => {
  assert.match(css, /container: dashboard \/ inline-size;/);
  assert.match(css, /\.dashboard \.quick-actions \{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);[\s\S]*?align-items: stretch;/);
  assert.match(css, /@container dashboard \(max-width: 980px\) \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /@container dashboard \(max-width: 560px\) \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /@container dashboard \(max-width: 760px\) \{[\s\S]*?\.hero-art \{[\s\S]*?display: none;/);
});

test('Quick Actions expose stable hover, keyboard focus, active and reduced-motion states', () => {
  assert.match(css, /\.dashboard \.quick-action \{[\s\S]*?min-height: 112px;[\s\S]*?height: 100%;/);
  assert.match(css, /\.dashboard \.quick-action:hover \{[\s\S]*?border-color: var\(--color-primary\);/);
  assert.match(css, /\.dashboard \.quick-action:focus-visible \{[\s\S]*?outline: 2px solid var\(--color-primary\);[\s\S]*?outline-offset: 3px;/);
  assert.match(css, /\.dashboard \.quick-action:active \{[\s\S]*?transform: translateY\(0\);/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?transition: none;/);
});
