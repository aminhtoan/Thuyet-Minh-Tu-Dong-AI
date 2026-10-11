import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const createSource = await readFile(new URL('../src/pages/NewProjectPlaceholder.tsx', import.meta.url), 'utf8');
const detailSource = await readFile(new URL('../src/pages/ProjectDetailPage.tsx', import.meta.url), 'utf8');
const uploadSource = await readFile(new URL('../src/features/projects/uploadService.ts', import.meta.url), 'utf8');

test('create project validates required fields and sends supported description', () => {
  assert.match(createSource, /Vui lòng chọn ngôn ngữ nguồn/);
  assert.match(createSource, /htmlFor="project-description">Mô tả/);
  assert.match(uploadSource, /JSON\.stringify\(\{ name: projectName, description, sourceLanguage \}\)/);
});

test('web upload uses an honest indeterminate state and keeps cancellation', () => {
  assert.match(createSource, /Đang tải phương tiện lên máy chủ/);
  assert.match(createSource, /Hủy tải lên/);
  assert.doesNotMatch(createSource, /<ProgressBar/);
});

test('project detail exposes workflow, media, save feedback and duplicate-submit guard', () => {
  assert.match(detailSource, /<WorkflowSteps/);
  assert.match(detailSource, /Phương tiện nguồn/);
  assert.match(detailSource, /saveLock\.current/);
  assert.match(detailSource, /Đã lưu thay đổi dự án/);
});
