import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(`../src/features/results/${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, { exports, require: name => { if (!(name in dependencies)) throw Error(`Unexpected import ${name}`); return dependencies[name]; }, Date, Intl });
  return exports;
}
const narration = (patch = {}) => ({ id: 'n-used', projectId: 'p1', targetLanguage: 'en', voice: { id: 'v1', name: 'Alloy' }, speed: 1, mimeType: 'audio/mpeg', fileSize: 12, duration: 2, audioUrl: '/projects/p1/narrations/n-used/audio', createdAt: '2026-10-25T08:00:00Z', ...patch });
const video = (patch = {}) => ({ id: 'r1', projectId: 'p1', narrationId: 'n-used', targetLanguage: 'en', mimeType: 'video/mp4', fileSize: 30, duration: 2, fileUrl: '/projects/p1/results/r1/file', createdAt: '2026-10-25T09:00:00Z', ...patch });
const { resultRows } = load('resultUtils.ts', { '../projects/languages': { languageDisplayName: code => code } });
async function get(results, narrations, language = 'en') {
  const requests = [], before = JSON.stringify({ results, narrations });
  const { resultService } = load('resultService.ts', {
    '../../lib/api': { api: async (path, options) => { requests.push(path); assert.equal(options?.method ?? 'GET', 'GET'); return path.endsWith('/results') ? { results } : { narrations }; }, apiBlob() { throw Error('No media fetch expected'); } },
    '../projects/projectRepository': { projectRepository: {} },
  });
  const result = await resultService.getByProjectId('p1', language);
  assert.equal(requests.length, 2); assert.equal(requests.every(path => path.startsWith('/projects/p1/')), true);
  assert.equal(JSON.stringify({ results, narrations }), before);
  return result;
}
function rows(result) { return Object.fromEntries(resultRows({ name: 'Synthetic project', sourceLanguage: 'vi' }, result)); }

test('AUDIO and VIDEO map the same saved narration voice/speed into actual Result rows', async () => {
  const audio = await get([], [narration()]), mp4 = await get([video()], [narration()]);
  for (const result of [audio, mp4]) { assert.equal(result.voiceName, 'Alloy'); assert.equal(result.speed, 1); assert.equal(rows(result)['Giọng đọc'], 'Alloy'); assert.equal(rows(result)['Tốc độ'], '1x'); }
  assert.equal(audio.artifactType, 'AUDIO'); assert.equal(mp4.artifactType, 'VIDEO'); assert.equal(mp4.filePath, video().fileUrl);
});
test('VIDEO joins exact narrationId, not latest narration or current voice settings', async () => {
  const result = await get([video()], [narration({ id: 'n-latest', voice: { name: 'Different voice' }, speed: 1.5, createdAt: '2026-10-25T10:00:00Z' }), narration({ speed: 0.85 })]);
  assert.equal(result.voiceName, 'Alloy'); assert.equal(result.speed, 0.85);
});
test('missing linked narration preserves video and displays missing data without defaults', async () => {
  const result = await get([video()], [narration({ id: 'other' })]);
  assert.equal(result.artifactType, 'VIDEO'); assert.equal(rows(result)['Giọng đọc'], 'Không có dữ liệu'); assert.equal(rows(result)['Tốc độ'], 'Không có dữ liệu');
});
test('missing or invalid metadata follows identical AUDIO/VIDEO rules without inventing Alloy/1x', async () => {
  for (const patch of [{ voice: null, speed: null }, { voice: { name: '  ' }, speed: NaN }, { voice: undefined, speed: -1 }]) {
    for (const results of [[], [video()]]) {
      const result = await get(results, [narration(patch)]);
      assert.equal(rows(result)['Giọng đọc'], 'Không có dữ liệu'); assert.equal(rows(result)['Tốc độ'], 'Không có dữ liệu');
    }
  }
});
test('voice and speed are independently optional, not an all-or-nothing fallback', async () => {
  const voiceOnly = await get([video()], [narration({ speed: undefined })]);
  assert.equal(voiceOnly.voiceName, 'Alloy'); assert.equal(rows(voiceOnly)['Tốc độ'], 'Không có dữ liệu');
  const speedOnly = await get([], [narration({ voice: null, speed: 1.2 })]);
  assert.equal(rows(speedOnly)['Giọng đọc'], 'Không có dữ liệu'); assert.equal(rows(speedOnly)['Tốc độ'], '1.2x');
});
test('matching narrationId from another project/language cannot supply video metadata', async () => {
  for (const patch of [{ projectId: 'p2' }, { targetLanguage: 'th' }]) {
    const result = await get([video()], [narration(patch)]);
    assert.equal(result.voiceName, undefined); assert.equal(result.speed, undefined);
  }
  assert.equal(await get([], [narration({ projectId: 'p2' })]), null);
  assert.equal(await get([video({ projectId: 'p2' })], []), null);
});
test('metadata is taken from the narration of the selected newest video in requested language', async () => {
  const result = await get([video({ id: 'r-old', createdAt: '2026-10-24T09:00:00Z' }), video({ id: 'r-new', narrationId: 'n-new' }), video({ id: 'r-th', targetLanguage: 'th', createdAt: '2026-10-26T09:00:00Z' })], [narration(), narration({ id: 'n-new', voice: { name: 'Actual new voice' }, speed: 1.1 })]);
  assert.equal(result.id, 'r-new'); assert.equal(result.voiceName, 'Actual new voice'); assert.equal(result.speed, 1.1);
});
