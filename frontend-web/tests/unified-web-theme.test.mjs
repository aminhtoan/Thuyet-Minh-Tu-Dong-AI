import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';

const styles = new URL('../src/styles/', import.meta.url);
const read = name => readFile(new URL(name, styles), 'utf8');
const root = await read('tokens.css');
const museum = await read('museum-theme.css');
const declarations = css => Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [key, value.trim()]));
const tokens = declarations(root);
function resolve(key, values = tokens, stack = []) {
  assert.ok(!stack.includes(key), `Token cycle: ${[...stack, key]}`);
  assert.ok(values[key], `Missing ${key}`);
  return values[key].replace(/var\((--[\w-]+)\)/g, (_, next) => resolve(next, values, [...stack, key]));
}
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test('shared palette resolves losslessly for Public and Customer without alias cycles', () => {
  const scoped = { ...tokens, ...declarations(museum.slice(0, museum.indexOf('  min-width:'))) };
  for (const [key, expected] of Object.entries({ '--color-primary': '#5850ec', '--color-background': '#f8fafc', '--color-surface-secondary': '#f1f5f9', '--color-text-primary': '#0f172a', '--color-accent': '#794cff', '--color-surface': '#ffffff', '--color-sidebar': '#111c32', '--color-primary-hover': '#4538cf', '--color-primary-pressed': '#3730a3', '--color-primary-light': '#f0eeff', '--color-accent-light': '#eee9ff', '--color-text-secondary': '#475569', '--color-text-muted': '#64748b', '--color-border': '#e2e8f0' })) {
    assert.equal(resolve(key), expected); assert.equal(resolve(key, scoped), expected);
  }
  for (const key of ['--font-family', '--radius-md', '--shadow-sm', '--space-md']) assert.equal(resolve(key, scoped), resolve(key));
  assert.equal(resolve('--museum-font-family', scoped), resolve('--font-family'));
  assert.equal(resolve('--museum-shadow-md', scoped), resolve('--shadow-md'));
  assert.equal(resolve('--museum-radius-lg', scoped), resolve('--radius-lg'));
  assert.equal(resolve('--museum-space-6', scoped), resolve('--space-lg'));
});

test('functional text, focus and data colors have measured contrast on their surfaces', () => {
  for (const [fg, bg] of [
    ['--color-primary', '--color-surface'], ['--color-primary', '--color-background'],
    ['--color-primary', '--color-surface-secondary'], ['--color-text-secondary', '--color-background'],
    ['--color-text-muted', '--color-surface'], ['--color-on-primary', '--color-primary'],
    ['--color-on-primary', '--color-primary-hover'], ['--color-on-primary', '--color-primary-pressed'],
    ['--sidebar-text', '--color-sidebar'], ['--color-accent-ink', '--color-accent-light'],
  ]) assert.ok(contrast(resolve(fg), resolve(bg)) >= 4.5, `${fg} on ${bg}`);
  for (const [fg, bg] of [['--color-focus', '--color-background'], ['--color-focus-on-dark', '--color-sidebar'], ['--chart-secondary', '--color-surface'], ['--color-border-strong', '--color-surface']]) {
    assert.ok(contrast(resolve(fg), resolve(bg)) >= 3, `${fg} on ${bg}`);
  }
});

test('success, warning, error and info remain semantic rather than brand-colored', async () => {
  for (const [name, color] of [['success', '#15803d'], ['warning', '#b45309'], ['error', '#c62828'], ['info', '#0369a1']]) {
    assert.equal(resolve(`--color-${name}`), color);
    assert.ok(contrast(color, resolve(`--color-${name}-light`)) >= 4.5);
  }
  const translation = await read('translation.css');
  assert.match(translation, /translation-feedback--warning[^}]*var\(--color-warning\)/);
  const dashboard = await read('dashboard.css');
  assert.match(dashboard, /dashboard-donut__segment--processing[^}]*var\(--color-info\)/);
  assert.match(dashboard, /linear-gradient\(180deg, var\(--chart-secondary\), var\(--chart-primary\)\)/);
});

test('no wine/cream/bronze identity remains; shared controls keep focus and motion safeguards', async () => {
  for (const name of (await readdir(styles)).filter(n => n.endsWith('.css'))) {
    assert.doesNotMatch(await read(name), /#(?:7b252b|612026|4d181c|faf7f0|f1e8d8|242321|b58a4b|625d55|d8ccb8|806137|e7ddcf|e1bd84|7a292e|b08a52|f3ebdd|fffdf8|ede2d0|f0e2ca)\b|--brand-(?:wine|cream|bronze)|123 37 43|181 138 75/i, name);
  }
  const controls = await read('components.css');
  assert.match(controls, /\.button:disabled/); assert.match(controls, /prefers-reduced-motion/);
  assert.match(controls, /field__control:focus-within[^}]*var\(--color-primary\)/);
  assert.match(await read('shell.css'), /sidebar__link--active[^}]*var\(--sidebar-active\)/);
});
