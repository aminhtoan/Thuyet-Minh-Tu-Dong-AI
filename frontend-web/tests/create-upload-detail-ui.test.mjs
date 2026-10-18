import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { MAX_MEDIA_FILE_SIZE, validateMediaFile } from '../src/features/projects/mediaUpload.ts';

const createSource = await readFile(new URL('../src/pages/NewProjectPlaceholder.tsx', import.meta.url), 'utf8');
const detailSource = await readFile(new URL('../src/pages/ProjectDetailPage.tsx', import.meta.url), 'utf8');
const uploadSource = await readFile(new URL('../src/features/projects/uploadService.ts', import.meta.url), 'utf8');
const uploadCss = await readFile(new URL('../src/styles/upload.css', import.meta.url), 'utf8');
const detailCss = await readFile(new URL('../src/styles/project-detail.css', import.meta.url), 'utf8');
const topbarSource = await readFile(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');

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
  assert.match(detailSource, /Tiếp tục tải phương tiện/);
  assert.match(detailSource, /uploadLock\.current/);
  assert.match(uploadSource, /export async function uploadMediaToProject/);
});

test('Create Project uses the approved heading, explicit primary action and accessible drag alternative', () => {
  assert.match(topbarSource, /<h1>Tạo dự án mới<\/h1>/);
  assert.match(createSource, /aria-label="Biểu mẫu tạo dự án mới"/);
  assert.match(createSource, /onDragEnter=\{onDragEnter\}.*onDrop=\{onDrop\}/s);
  assert.match(createSource, /onClick=\{\(\) => inputRef\.current\?\.click\(\)\}>Chọn tệp/);
  assert.match(createSource, />Thay đổi<\/Button>/);
  assert.match(createSource, /onClick=\{removeFile\}>Xóa<\/Button>/);
  assert.match(createSource, />Tạo dự án<Icon/);
  assert.match(createSource, /to="\/projects">Quay lại danh sách/);
  assert.doesNotMatch(createSource, /<ProgressBar/);
});

test('media validation preserves supported formats and the real 500 MB limit', () => {
  assert.equal(MAX_MEDIA_FILE_SIZE, 500 * 1024 * 1024);
  assert.deepEqual(validateMediaFile({ name: 'âm thanh thử nghiệm.mp3', size: 1024, mimeType: 'audio/mpeg' }), { valid: true, mediaType: 'AUDIO' });
  assert.deepEqual(validateMediaFile({ name: 'video.mp4', size: 1024, mimeType: 'video/mp4' }), { valid: true, mediaType: 'VIDEO' });
  assert.equal(validateMediaFile({ name: 'archive.zip', size: 1024, mimeType: 'application/zip' }).valid, false);
  assert.equal(validateMediaFile({ name: 'large.mp3', size: MAX_MEDIA_FILE_SIZE + 1, mimeType: 'audio/mpeg' }).valid, false);
});

test('Project Detail presents verified workflow and metadata states without starting mutations', () => {
  for (const state of ['PROCESSING', 'FAILED', 'COMPLETED']) assert.match(detailSource, new RegExp(`workflow\\?\\.state === '${state}'`));
  for (const state of ['ERROR', 'UNKNOWN', 'LOADING']) assert.match(detailSource, new RegExp(`mediaState === '${state}'`));
  assert.match(detailSource, /<ProgressBar value=\{project\.workflow\.processing\.progress\}/);
  assert.match(detailSource, /PageHeader title=\{project\.name\}/);
  assert.match(detailSource, /<ProjectStatusBadge status=\{project\.status\}/);
  assert.doesNotMatch(detailSource, /processing\.retry\(|\.generate\(|\.translate\(|\.start\(/);
});

test('DRAFT resume remains existing-project-only and exposes replace, remove, cancel and retry states', () => {
  const existingProjectTransport = uploadSource.slice(uploadSource.indexOf('export async function uploadMediaToProject'), uploadSource.indexOf('export async function uploadProjectMedia'));
  assert.match(existingProjectTransport, /\/projects\/\$\{encodeURIComponent\(projectId\)\}\/media/);
  assert.doesNotMatch(existingProjectTransport, /method: 'DELETE'|api<CreatedProject>/);
  assert.match(detailSource, /uploadInputRef\.current\?\.click\(\)/);
  assert.match(detailSource, /onClick=\{clearUploadFile\}>Xóa tệp đã chọn/);
  assert.match(detailSource, /onClick=\{cancelUpload\}>Hủy tải lên/);
  assert.match(detailSource, /uploadStatus === 'failed' \|\| uploadStatus === 'cancelled' \? 'Thử tải lại'/);
});

test('Project Detail CSS is isolated from Auth and Voice and remains responsive', () => {
  assert.doesNotMatch(detailSource, /className="auth-form"|className="voice-actions"/);
  assert.doesNotMatch(detailCss, /\.auth-form|\.voice-actions/);
  assert.match(detailCss, /\.project-detail-content-grid[\s\S]*grid-template-columns: minmax\(0, 1\.05fr\) minmax\(0, \.95fr\)/);
  assert.match(detailCss, /@media \(max-width: 1100px\)[\s\S]*\.project-detail-content-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(detailCss, /@media \(max-width: 640px\)/);
  assert.match(uploadCss, /\.upload-layout[^{]*\{[^}]*max-width: 68rem/);
  assert.match(uploadCss, /\.upload-primary-actions/);
});
