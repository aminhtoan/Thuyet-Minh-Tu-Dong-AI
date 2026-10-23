import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [source, css] = await Promise.all([
  readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/dashboard.css', import.meta.url), 'utf8'),
]);

test('Hero uses existing museum photograph with readable copy and unchanged creation route', () => {
  assert.match(css, /min-height: 240px; padding: 24px 32px; border-radius: 16px/);
  assert.match(source, /className="dashboard-hero__photo" src="\/museum\/images\/hero.jpg"/);
  assert.doesNotMatch(source, /className="hero-art"/);
  assert.match(source, /Khởi tạo hành trình thuyết minh đa ngôn ngữ/);
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

test('museum banner and compact cards keep natural height, mobile copy and safe chart geometry', async () => {
  const { existsSync } = await import('node:fs');
  assert.ok(existsSync(new URL('../public/museum/images/hero.jpg', import.meta.url)));
  assert.match(source, /Tạo và quản lý nội dung thuyết minh bảo tàng trên một nền tảng\./);
  assert.match(css, /linear-gradient\(90deg, rgb\(17 28 50 \/ 96%\)/);
  assert.match(css, /\.dashboard \.quick-action \{ min-height: 100px; padding: 14px/);
  assert.match(css, /dashboard-donut__visual svg \{ width: min\(100%, 200px\)/);
  assert.match(css, /\.dashboard \.dashboard-recent-row \{ min-height: 60px/);
  assert.match(css, /\.dashboard \.hero-cta:focus-visible \{ outline: 3px solid #fff/);
  const sidebar = await readFile(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
  const topbar = await readFile(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');
  for (const component of [sidebar, topbar]) { assert.match(component, /customerBrand.name/); assert.match(component, /<MuseumBrandIcon/); }
});
