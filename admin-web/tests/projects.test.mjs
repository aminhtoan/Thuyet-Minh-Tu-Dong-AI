import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const require = createRequire(import.meta.url);
const root = path.resolve('src');
const rows = ['TRANSLATING', 'FAILED', 'COMPLETED'].map((status, i) => ({ id: String(i), name: `Project ${i}`, user: { id: 'u', fullName: 'Editor', email: 'editor@example.test' }, sourceLanguage: 'vi', targetLanguages: ['en'], media: null, status, progress: 100, createdAt: '2026-01-01', updatedAt: '2026-01-01', narrationApproval: { status: 'NONE_APPROVED', approved: 0, total: 1 } }));

function compile(file, overrides = {}, cache = new Map()) {
  const full = path.resolve(root, file);
  if (cache.has(full)) return cache.get(full);
  const exports = {}; cache.set(full, exports);
  const code = ts.transpileModule(readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(code, { exports, URLSearchParams, require: key => {
    if (overrides[key]) return overrides[key];
    if (key.endsWith('.css')) return {};
    if (!key.startsWith('.')) return require(key);
    const target = path.resolve(path.dirname(full), key);
    return compile(path.relative(root, target + (key.endsWith('.ts') || key.endsWith('.tsx') ? '' : readFileExists(target + '.tsx') ? '.tsx' : '.ts')), overrides, cache);
  } });
  return exports;
}
function readFileExists(file) { try { readFileSync(file); return true; } catch { return false; } }

test('project GET filters and manual approval payload stay unchanged; status100 is not completed', async () => {
  const calls = [];
  const blobCalls = [];
  const previewBlob = new Blob(['preview'], { type: 'audio/mpeg' });
  const { mapProject, adminProjectService } = compile('services/adminProjectService.ts', { '../lib/api': { adminApiBlob: async (url, init = {}) => {
    blobCalls.push({ url, init }); return previewBlob;
  }, adminApi: async (url, init = {}) => {
    calls.push({ url, init });
    return url.includes('/approval') ? { narration: { id: 'n1' } } : { items: rows, summary: {}, pagination: {} };
  } } });
  const result = await adminProjectService.getProjects({ page: 3, limit: 10, search: 'Museum', status: 'TRANSLATING', mediaType: 'VIDEO' });
  const url = new URL(calls[0].url, 'http://fixture');
  assert.equal(url.searchParams.get('search'), 'Museum');
  assert.equal(url.searchParams.get('page'), '3');
  assert.equal(url.searchParams.get('mediaType'), 'VIDEO');
  assert.equal(url.searchParams.get('status'), 'TRANSLATING');
  assert.equal(calls[0].init.method, undefined);
  assert.equal(result.items[0].status, 'TRANSLATING');
  assert.equal(result.items[0].progress, 100);
  await adminProjectService.updateNarrationApproval('n1', true);
  assert.equal(calls[1].url, '/admin/narrations/n1/approval');
  assert.equal(calls[1].init.method, 'PATCH');
  assert.equal(calls[1].init.body, '{"isApproved":true}');
  const controller = new AbortController();
  assert.equal(await adminProjectService.getNarrationAudio('/api/projects/p1/narrations/n1/audio', { signal: controller.signal }), previewBlob);
  assert.equal(blobCalls[0].url, '/api/projects/p1/narrations/n1/audio');
  assert.equal(blobCalls[0].init.signal, controller.signal);
  const data = { items: rows.map(mapProject), pagination: { page: 1, total: 3, limit: 10, totalPages: 1 } };
  const { AdminProjectsPage } = compile('pages/AdminProjectsPage.tsx', {
    '../hooks/useOperations': { useProjects: () => ({ data, loading: false, error: false, retry() {} }) },
    '../components/operations/NarrationApprovalModal': { NarrationApprovalModal: () => null },
    '../components/operations/OriginalAudioPublicationModal': { OriginalAudioPublicationModal: () => null },
    '../components/operations/VideoPublicationModal': { VideoPublicationModal: () => null },
  });
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminProjectsPage)));
  assert.equal((html.match(/disabled=""/g) ?? []).length, 4, 'two unavailable approvals plus two pagination boundaries');
  assert.ok(html.includes('Đang dịch') && html.includes('Thất bại') && html.includes('Hoàn thành'));
  assert.equal((html.match(/Trạng thái chưa phải Hoàn thành/g) ?? []).length, 2);
});

test('Admin narration preview uses authenticated Blob transport and revokes object URLs', () => {
  const modal = readFileSync(new URL('../src/components/operations/NarrationApprovalModal.tsx', import.meta.url), 'utf8');
  const api = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
  const backend = readFileSync(new URL('../../backend/src/services/admin.service.ts', import.meta.url), 'utf8');
  assert.match(modal, /getNarrationAudio\(narration\.audioUrl/);
  assert.match(modal, /URL\.createObjectURL\(blob\)/);
  assert.match(modal, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(modal, /controller\.abort\(\)/);
  assert.match(api, /adminApiBlob/);
  assert.match(api, /authorization.*Bearer/);
  assert.match(api, /response\.blob\(\)/);
  assert.match(backend, /audioUrl: `\/api\/projects\/\$\{n\.projectId\.toString\(\)\}\/narrations\/\$\{n\._id\.toString\(\)\}\/audio`/);
  assert.doesNotMatch(backend, /audioUrl: `\/api\/projects\/public-audio\/\$\{n\.projectId/);
});

test('project row opens original-audio modal for the selected project without a COMPLETED requirement', () => {
  let cursor = 0; const slots = [];
  const React = { ...require('react'), useState(value) { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], value => { slots[index] = value; }]; } };
  const projects = rows.map((row, index) => ({ ...row, customerName: 'Fixture', id: `project-${index}` }));
  const { AdminProjectsPage } = compile('pages/AdminProjectsPage.tsx', {
    react: React,
    '../hooks/useOperations': { useProjects: () => ({ data: { items: projects, pagination: { total: 3, totalPages: 1, page: 1 } }, loading: false, error: false, retry() {} }) },
    '../components/operations/NarrationApprovalModal': { NarrationApprovalModal: 'ai-modal' },
    '../components/operations/OriginalAudioPublicationModal': { OriginalAudioPublicationModal: 'original-modal' },
    '../components/operations/VideoPublicationModal': { VideoPublicationModal: 'video-modal' },
  });
  const findAll = (node, predicate) => !node || typeof node !== 'object' ? [] : [ ...(predicate(node) ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(child => findAll(child, predicate)) ];
  const render = () => { cursor = 0; return AdminProjectsPage(); };
  let tree = render();
  const actions = findAll(tree, node => node.props?.className === 'projects-row-actions');
  assert.equal(actions.length, 3);
  const labels = [actions[0].props.children].flat().map(node => node.props.children);
  assert.deepEqual(labels, ['Xem', 'Duyệt', 'Duyệt video', 'Âm thanh gốc']);
  const buttons = findAll(tree, node => node.props?.children === 'Âm thanh gốc');
  assert.equal(buttons[0].props.disabled, undefined);
  buttons[0].props.onClick(); tree = render();
  let modal = findAll(tree, node => node.type === 'original-modal')[0];
  assert.equal(modal.props.project.id, 'project-0');
  assert.equal(findAll(tree, node => node.type === 'ai-modal').length, 0);
  modal.props.onClose(); tree = render();
  assert.equal(findAll(tree, node => node.type === 'original-modal').length, 0);
  findAll(tree, node => node.props?.children === 'Âm thanh gốc')[1].props.onClick(); tree = render();
  modal = findAll(tree, node => node.type === 'original-modal')[0];
  assert.equal(modal.props.project.id, 'project-1');
});

test('Duyệt video opens only the chosen project control and preserves independent audio actions', () => {
  let cursor = 0; const slots = [];
  const React = { ...require('react'), useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = value; }]; } };
  const projects = rows.map((row, index) => ({ ...row, id: `video-project-${index}`, customerName: 'Fixture' }));
  const { AdminProjectsPage } = compile('pages/AdminProjectsPage.tsx', {
    react: React,
    '../hooks/useOperations': { useProjects: () => ({ data: { items: projects, pagination: { total: 3, totalPages: 1, page: 1 } }, loading: false, error: false, retry() {} }) },
    '../components/operations/NarrationApprovalModal': { NarrationApprovalModal: 'ai-modal' },
    '../components/operations/OriginalAudioPublicationModal': { OriginalAudioPublicationModal: 'original-modal' },
    '../components/operations/VideoPublicationModal': { VideoPublicationModal: 'video-modal' },
  });
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : [...(predicate(node) ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(child => all(child, predicate))];
  const render = () => { cursor = 0; return AdminProjectsPage(); };
  let tree = render();
  assert.equal(all(tree, node => node.type === 'video-modal').length, 0);
  assert.equal(all(tree, node => node.props?.children === 'Xem').length, 3);
  assert.equal(all(tree, node => node.props?.children === 'Duyệt').length, 3);
  assert.equal(all(tree, node => node.props?.children === 'Âm thanh gốc').length, 3);
  const buttons = all(tree, node => node.props?.children === 'Duyệt video');
  assert.equal(buttons.length, 3); assert.equal(buttons[0].props.variant, 'secondary');
  assert.equal(buttons[0].props.disabled, undefined, 'a project need not be COMPLETED merely to inspect available MP4s');
  buttons[0].props.onClick(); tree = render();
  let modal = all(tree, node => node.type === 'video-modal')[0];
  assert.equal(modal.props.project.id, 'video-project-0');
  assert.equal(all(tree, node => node.type === 'ai-modal' || node.type === 'original-modal').length, 0);
  modal.props.onClose(); tree = render(); assert.equal(all(tree, node => node.type === 'video-modal').length, 0);
  all(tree, node => node.props?.children === 'Duyệt video')[2].props.onClick(); tree = render();
  modal = all(tree, node => node.type === 'video-modal')[0]; assert.equal(modal.props.project.id, 'video-project-2');
  const css = readFileSync(new URL('../src/styles/projects.css', import.meta.url), 'utf8');
  assert.match(css, /\.projects-row-actions\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.video-publication-dialog\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto/);
});
