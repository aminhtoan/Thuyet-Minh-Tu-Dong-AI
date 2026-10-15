import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../src/styles/dashboard.css', import.meta.url), 'utf8');
const fonts = await readFile(new URL('../src/styles/dashboard-fonts.css', import.meta.url), 'utf8');
function table(buffer, tag) {
  for (let i = 0; i < buffer.readUInt16BE(4); i++) {
    const offset = 12 + i * 16;
    if (buffer.toString('ascii', offset, offset + 4) === tag) return buffer.readUInt32BE(offset + 8);
  }
  throw new Error(`Missing font table ${tag}`);
}
function hasGlyph(buffer, codepoint) {
  const cmap = table(buffer, 'cmap');
  for (let i = 0; i < buffer.readUInt16BE(cmap + 2); i++) {
    const record = cmap + 4 + i * 8;
    const platform = buffer.readUInt16BE(record), encoding = buffer.readUInt16BE(record + 2);
    if (platform !== 0 && !(platform === 3 && [1, 10].includes(encoding))) continue;
    const base = cmap + buffer.readUInt32BE(record + 4), format = buffer.readUInt16BE(base);
    if (format === 4 && codepoint <= 0xffff) {
      const count = buffer.readUInt16BE(base + 6) / 2, ends = base + 14, starts = ends + count * 2 + 2;
      const deltas = starts + count * 2, ranges = deltas + count * 2;
      for (let segment = 0; segment < count; segment++) {
        const start = buffer.readUInt16BE(starts + segment * 2), end = buffer.readUInt16BE(ends + segment * 2);
        if (codepoint < start || codepoint > end) continue;
        const delta = buffer.readInt16BE(deltas + segment * 2), range = buffer.readUInt16BE(ranges + segment * 2);
        if (!range) return ((codepoint + delta) & 0xffff) !== 0;
        const glyph = buffer.readUInt16BE(ranges + segment * 2 + range + (codepoint - start) * 2);
        return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
      }
    }
    if (format === 12) {
      for (let group = 0; group < buffer.readUInt32BE(base + 12); group++) {
        const entry = base + 16 + group * 12;
        const start = buffer.readUInt32BE(entry), end = buffer.readUInt32BE(entry + 4);
        if (codepoint >= start && codepoint <= end) return buffer.readUInt32BE(entry + 8) + codepoint - start !== 0;
      }
    }
  }
  return false;
}
test('self-hosted font weights are real TTF assets with Vietnamese glyph coverage and license', async () => {
  for (const [file, weight] of [['regular', 400], ['semibold', 600], ['bold', 700]]) {
    const buffer = await readFile(new URL(`../src/assets/fonts/be-vietnam-pro/${file}.ttf`, import.meta.url));
    assert.equal(buffer.readUInt32BE(0), 0x00010000);
    assert.equal(buffer.readUInt16BE(table(buffer, 'OS/2') + 4), weight);
    for (const character of 'Người kể chuyện AI — Tiếng Việt Đặng Nguyễn ộ ấ ự Ễ') assert.ok(hasGlyph(buffer, character.codePointAt(0)), `${file}: missing ${character}`);
  }
  const license = await readFile(new URL('../src/assets/fonts/be-vietnam-pro/OFL.txt', import.meta.url), 'utf8');
  assert.match(license, /Copyright 2021 The Be Vietnam Pro Project Authors/);
  assert.match(license, /SIL OPEN FONT LICENSE Version 1.1/);
});
test('font loading is local, swap-based and opt-in only inside Dashboard', () => {
  assert.equal((fonts.match(/font-display: swap/g) ?? []).length, 3);
  assert.doesNotMatch(fonts, /src:\s*url\(https?:/);
  assert.match(css, /@import '\.\/dashboard-fonts.css'/);
  assert.match(css, /--dashboard-font: 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif/);
  assert.match(css, /font-family: var\(--dashboard-font\)/);
});
test('Dashboard scale and spacing use scoped foundation without changing global brand tokens', async () => {
  for (const [name, value] of [['title', 'clamp(26px, 2vw, 28px)'], ['section-title', '20px'], ['body', '15px'], ['label', '13px'], ['chart-label', '12px'], ['kpi', '30px']]) assert.ok(css.includes(`--dashboard-${name}: ${value}`));
  for (const spacing of [8, 12, 16, 24, 32]) assert.match(css, new RegExp(`--dashboard-space-[a-z]+: ${spacing}px`));
  assert.match(css, /--dashboard-radius: 16px/); assert.match(css, /--dashboard-radius-inner: 14px/);
  const tokens = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
  for (const color of ['#111c32', '#5850ec', '#794cff', '#f8fafc']) assert.ok(tokens.includes(color));
  assert.doesNotMatch(css, /^\.section-heading\s/m);
});
test('readability protections preserve content instead of hiding long names and badges', () => {
  assert.match(css, /\.dashboard \.quick-action > span:last-child \{ min-width: 0; flex: 1;/);
  assert.match(css, /\.dashboard \.dashboard-recent-row strong a \{ white-space: normal; overflow: visible;/);
  assert.match(css, /\.dashboard \.badge \{[^}]*white-space: normal/);
  assert.match(css, /\.dashboard \.dashboard-activity li > div \{ min-width: 0;/);
  assert.match(css, /\.dashboard \.section-heading \{[^}]*flex-wrap: wrap/);
  assert.match(css, /\.dashboard \.dashboard-chart__label \{ font-size: var\(--dashboard-chart-label\)/);
});
test('existing routes, section order, chart/KPI guards and source fields remain intact', async () => {
  const source = await readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8');
  const headings = ['dashboard-hero', 'quick-actions', 'dashboard-overview', 'dashboard-grid'];
  let previous = -1;
  for (const heading of headings) { const next = source.indexOf(`className="${heading}"`); assert.ok(next > previous); previous = next; }
  assert.match(source, /hasCompleteProjectDataset\(projects.length, pagination\)/);
  assert.match(source, /pagination\?\.total \?\? statistics.total/);
  assert.match(source, /Math.max\(\(day.value \/ maximum\) \* 100, day.value \? 8 : 0\)/);
  assert.equal((source.match(/route: '\/projects(?:\/new)?'/g) ?? []).length, 4);
});
