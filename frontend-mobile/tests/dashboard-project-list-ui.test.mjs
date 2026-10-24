import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Mobile Dashboard keeps real repository data and supported quick actions', async () => {
  const source = await readFile(new URL('../src/screens/DashboardScreen.tsx', import.meta.url), 'utf8');
  assert.match(source, /useDashboardProjects as useProjects/);
  assert.match(source, /useProjects\(\)/);
  assert.match(source, /Tạo thuyết minh/);
  for (const label of ['Bản ghi', 'Bản dịch', 'Giọng đọc']) assert.ok(source.includes(label));
  assert.match(source, /onRetry/);
  assert.doesNotMatch(source, /mockProjects|fixtureProjects/);
});

test('Mobile Projects preserves page reset, focus reload and accessible pagination', async () => {
  const [screen, hook] = await Promise.all([
    readFile(new URL('../src/screens/ProjectsScreen.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/projects/useProjects.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(screen, /setPage\(1\)/);
  assert.match(screen, /Phân trang dự án/);
  assert.match(screen, /accessibilityLiveRegion="polite"/);
  assert.match(hook, /useFocusEffect/);
});
