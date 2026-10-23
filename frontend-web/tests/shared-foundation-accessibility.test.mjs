import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Customer Web uses the existing local Be Vietnam Pro family and complete type tokens', async () => {
  const [tokens, globalCss, dashboardCss] = await Promise.all([
    readSource('../src/styles/tokens.css'),
    readSource('../src/styles/global.css'),
    readSource('../src/styles/dashboard.css'),
  ]);

  assert.match(tokens, /--brand-font-family: 'Be Vietnam Pro'/);
  assert.match(tokens, /--font-family: var\(--brand-font-family\)/);
  assert.match(tokens, /--font-size-xs: 0\.75rem/);
  assert.match(globalCss, /@import '\.\/dashboard-fonts.css'/);
  assert.doesNotMatch(dashboardCss, /@import '\.\/dashboard-fonts.css'/);
});

test('PageHeader exposes unique accessible title and description relationships', async () => {
  const source = await readSource('../src/components/layout/PageHeader.tsx');

  assert.match(source, /const titleId = useId\(\)/);
  assert.match(source, /const descriptionId = useId\(\)/);
  assert.match(source, /aria-labelledby=\{titleId\}/);
  assert.match(source, /aria-describedby=\{description \? descriptionId : undefined\}/);
  assert.match(source, /className="page-header__copy"/);
});

test('repeated EmptyState and ErrorState components do not use fixed DOM IDs', async () => {
  const [emptyState, errorState] = await Promise.all([
    readSource('../src/components/common/EmptyState.tsx'),
    readSource('../src/components/common/ErrorState.tsx'),
  ]);

  for (const source of [emptyState, errorState]) {
    assert.match(source, /const titleId = useId\(\)/);
    assert.match(source, /const descriptionId = useId\(\)/);
    assert.match(source, /aria-labelledby=\{titleId\}/);
    assert.match(source, /aria-describedby=\{descriptionId\}/);
  }
  assert.doesNotMatch(emptyState, /empty-state-title/);
  assert.doesNotMatch(errorState, /error-state-title/);
});

test('shared accessibility labels are Vietnamese and progress exposes its value', async () => {
  const [progress, password, placeholder] = await Promise.all([
    readSource('../src/components/common/ProgressBar.tsx'),
    readSource('../src/features/auth/PasswordField.tsx'),
    readSource('../src/components/common/PlaceholderPage.tsx'),
  ]);

  assert.match(progress, /label \?\? 'Tiến độ xử lý'/);
  assert.match(progress, /aria-valuetext=\{`\$\{normalizedValue\}%`\}/);
  assert.match(password, /'Ẩn mật khẩu'/);
  assert.match(password, /'Hiện mật khẩu'/);
  assert.doesNotMatch(placeholder, /implemented in a later sprint|ready for development|reusable UI foundation/);
});

test('shared focus and reduced-motion rules remain explicit', async () => {
  const [globalCss, componentsCss] = await Promise.all([
    readSource('../src/styles/global.css'),
    readSource('../src/styles/components.css'),
  ]);

  assert.match(globalCss, /:focus-visible\s*\{[^}]*outline: 3px solid var\(--color-primary\)/s);
  assert.match(componentsCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(componentsCss, /\.spinner \{ animation: none; \}/);
  assert.match(componentsCss, /\.progress__bar \{ transition: none; \}/);
});
