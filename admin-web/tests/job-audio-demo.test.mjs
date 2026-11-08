import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('job detail never plays unrelated localhost demo audio and keeps project navigation', () => {
  const source = readFileSync(new URL('../src/pages/AdminJobDetailPage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localhost|output_narration|<audio|\.play\(/);
  assert.match(source, /isTtsCompleted && j\.projectId/);
  assert.match(source, /to=\{.\/projects\/\$\{j\.projectId\}/);
  assert.match(source, /<StatusBadge status=\{j\.status\}/);
});
