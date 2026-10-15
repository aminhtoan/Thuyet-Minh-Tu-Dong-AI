import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getProfileIdentity } from '../src/features/auth/profileIdentity.mjs';

test('profile identity uses the authenticated name and falls back safely', () => {
  assert.deepEqual(getProfileIdentity({ fullName: ' Nguyễn Văn An ', email: 'an@example.com' }), { name: 'Nguyễn Văn An', email: 'an@example.com', initial: 'N' });
  assert.deepEqual(getProfileIdentity({ fullName: ' ', email: 'user@example.com' }), { name: 'user@example.com', email: 'user@example.com', initial: 'U' });
  assert.deepEqual(getProfileIdentity(null), { name: 'Tài khoản', email: '', initial: 'T' });
});

test('header profile reuses current-user, account route and logout services', async () => {
  const source = await readFile(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');
  assert.match(source, /authService\.me\(\)/);
  assert.match(source, /authService\.logout\(\)/);
  assert.match(source, /to="\/settings"/);
  assert.match(source, /confirmationMessages\.logout/);
  assert.doesNotMatch(source, /Nguyễn Văn An|user@example\.com/);
});

test('profile menu exposes keyboard and disclosure semantics', async () => {
  const source = await readFile(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded=\{profileOpen\}/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /event\.key === 'ArrowDown'/);
  assert.match(source, /event\.key === 'ArrowUp'/);
  assert.match(source, /document\.addEventListener\('pointerdown'/);
});

test('project list keeps its local search while the header search is route-aware', async () => {
  const topbar = await readFile(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');
  const projects = await readFile(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8');
  assert.match(topbar, /useLocation\(\)/);
  assert.match(topbar, /isProjectsPage = pathname === '\/projects'/);
  assert.match(topbar, /const showSearch = !isProjectsPage && !isNewProjectPage && !isHistoryPage && !isAccountPage/);
  assert.match(topbar, /\{showSearch && <form className="topbar__search"/);
  assert.match(projects, /className="project-list-search"/);
});

test('project list moves its semantic heading into the route-aware topbar', async () => {
  const topbar = await readFile(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');
  const projects = await readFile(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8');
  assert.match(topbar, /isProjectsPage \? <div className="topbar__page-heading"><h1>Dự án của tôi<\/h1><p>Tìm kiếm, theo dõi và tiếp tục hành trình thuyết minh của bạn\.<\/p><\/div>/);
  assert.doesNotMatch(projects, /<PageHeader|to="\/projects\/new"/);
});

test('profile interactions preserve focus styling and constrain long identities', async () => {
  const topbar = await readFile(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles/shell.css', import.meta.url), 'utf8');
  assert.match(topbar, /<strong title=\{identity\.name\}>/);
  assert.match(styles, /\.topbar-profile__trigger \{[^}]*max-width: 220px/);
  assert.match(styles, /text-overflow: ellipsis/);
  assert.match(styles, /background: #f1eeff/);
  assert.match(styles, /background: #fef2f2/);
  assert.match(styles, /transition: background-color 150ms ease/);
  assert.match(styles, /\.topbar-profile__item:focus-visible/);
});
