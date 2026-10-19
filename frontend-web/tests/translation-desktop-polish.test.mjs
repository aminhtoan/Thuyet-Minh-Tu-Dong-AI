import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../src/pages/TranslationPage.tsx', import.meta.url), 'utf8');
const groups = await readFile(new URL('../src/features/translation/GroupTranslationWorkspace.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/translation.css', import.meta.url), 'utf8');

test('Translation keeps a compact header and project context in both supported workspaces', () => {
  assert.match(page, /<PageHeader title="Bản dịch"/);
  assert.match(page, /<span className="translation-label">DỰ ÁN<\/span>/);
  assert.match(groups, /<PageHeader title="Bản dịch"/);
  assert.match(groups, /<span className="translation-label">DỰ ÁN<\/span>/);
  assert.doesNotMatch(page + groups, /KHÔNG GIAN DỰ ÁN|So sánh bản ghi gốc và kiểm tra từng phân đoạn đã dịch/);
});

test('redundant Translation helper copy is removed while data states remain explicit', () => {
  for (const text of [
    'Chọn ngôn ngữ để tạo hoặc mở lại bản dịch đã lưu.',
    'ngôn ngữ đích khả dụng.',
    'Bản dịch được tạo bởi dịch vụ trên máy chủ và lưu theo dự án.',
    'Chọn ngôn ngữ cần dịch để bắt đầu.',
    'cụm hiển thị ·',
    'Thời gian phút:giây.mili giây',
  ]) assert.doesNotMatch(page, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  assert.match(page, /Đang tải danh sách ngôn ngữ/);
  assert.match(page, /Không thể tải danh sách ngôn ngữ/);
  assert.match(page, /Chưa có ngôn ngữ đích được cấu hình/);
  assert.match(page, /Chưa có bản dịch cho ngôn ngữ đã chọn/);
});

test('desktop comparison remains compact, two-column and overflow safe', () => {
  assert.match(css, /grid-template-columns: minmax\(10rem, \.7fr\) minmax\(16rem, 1fr\) auto/);
  assert.match(css, /\.translation-segment__columns \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.doesNotMatch(css, /overflow-x:\s*hidden/);
});
