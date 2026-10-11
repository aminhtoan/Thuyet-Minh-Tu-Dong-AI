import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const createSource = await readFile(new URL('../src/screens/NewProjectScreen.tsx', import.meta.url), 'utf8');
const detailSource = await readFile(new URL('../src/screens/ProjectDetailScreen.tsx', import.meta.url), 'utf8');
const uploadSource = await readFile(new URL('../src/features/projects/uploadService.ts', import.meta.url), 'utf8');

test('mobile create project includes description and required-language feedback', () => {
  assert.match(createSource, /label="Mô tả"/);
  assert.match(createSource, /Vui lòng chọn ngôn ngữ nguồn/);
  assert.match(uploadSource, /const project = \{ name: projectName, description, sourceLanguage \}/);
});

test('mobile upload regression boundary preserves native staging and progress', () => {
  assert.match(createSource, /stagePickerAsset\(picked\)/);
  assert.match(uploadSource, /uploadNativeMedia/);
  assert.match(uploadSource, /onProgress/);
  assert.doesNotMatch(uploadSource, /new FormData|new Blob/);
});

test('mobile detail shows workflow, media and existing save guard', () => {
  assert.match(detailSource, /<WorkflowSteps/);
  assert.match(detailSource, /Phương tiện nguồn/);
  assert.match(detailSource, /runProjectSaveOnce/);
  assert.match(detailSource, /Đã lưu thay đổi dự án/);
});
