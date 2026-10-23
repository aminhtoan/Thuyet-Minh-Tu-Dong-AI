import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Dashboard quick actions use supported routes and real project state', async () => {
  const [web, mobile] = await Promise.all([
    readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../frontend-mobile/src/screens/DashboardScreen.tsx', import.meta.url), 'utf8'),
  ]);
  for (const source of [web, mobile]) {
    assert.match(source, /Tạo thuyết minh/);
    assert.match(source, /Dự án của tôi|\/projects/);
    assert.match(source, /useProjects\(\)/);
    assert.doesNotMatch(source, /mockProjects|fixtureProjects/);
  }
});

test('Project lists retain filters and server pagination during UI polish', async () => {
  const [web, mobile] = await Promise.all([
    readFile(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../frontend-mobile/src/screens/ProjectsScreen.tsx', import.meta.url), 'utf8'),
  ]);
  for (const source of [web, mobile]) {
    assert.match(source, /useProjectPage|useCompleteHistory/);
    assert.match(source, /page: 1|setPage\(1\)|next\.set\('page', '1'\)/);
    assert.match(source, /Trang trước/);
    assert.match(source, /Trang sau/);
  }
});

test('Web project empty states direct creation to the sidebar and distinguish filtered results', async () => {
  const source = await readFile(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8');
  assert.match(source, /<Icon name="projects" width="44"/);
  assert.match(source, /filtered \? 'Không tìm thấy dự án phù hợp' : 'Chưa có dự án'/);
  assert.match(source, /menu điều hướng để bắt đầu/);
  assert.doesNotMatch(source, /Xóa bộ lọc/);
  assert.equal((source.match(/to="\/projects\/new"/g) ?? []).length, 1);
});
