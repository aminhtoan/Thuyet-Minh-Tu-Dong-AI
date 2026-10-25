import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const screens = Object.fromEntries(await Promise.all(['Transcript', 'Translation', 'Voice', 'Generate', 'Result'].map(async (name) => [name, await readFile(new URL(`../src/screens/${name}Screen.tsx`, import.meta.url), 'utf8')])));
const stage = await readFile(new URL('../src/features/processing/ProcessingStage.tsx', import.meta.url), 'utf8');

test('mobile workflow screens retain the same five post-upload steps', () => {
  for (const step of ['transcript', 'translation', 'voice', 'generate', 'result']) assert.match(screens[step[0].toUpperCase() + step.slice(1)], new RegExp(`WorkflowSteps current="${step}"`));
});

test('mobile technical statuses use the shared Vietnamese dictionaries', () => {
  assert.match(screens.Translation, /translationStatusLabels\[editor\.status\]/);
  assert.match(screens.Voice, /voiceStatusLabels\[editor\.status\]/);
  assert.match(screens.Generate, /processingStatusLabels\[snapshot\.status\]/);
  assert.match(stage, /processingStatusLabels\[stage\.status\]/);
});

test('mobile result streams protected media and downloads only on manual native save', () => {
  assert.match(screens.Result, /localUri/);
  assert.match(screens.Result, /Sharing\.shareAsync/);
  assert.match(screens.Result, /Sharing\.isAvailableAsync/);
  assert.match(screens.Result, /Không thể tải hoặc lưu tệp kết quả/);
  assert.match(screens.Result, /<ResultPlayer/);
  assert.doesNotMatch(screens.Result, /accessToken|Authorization/);
});

test('read-only translation communicates the supported interaction honestly', () => {
  assert.match(screens.Translation, /chế độ chỉ đọc/);
  assert.doesNotMatch(screens.Translation, /<TranslationSegmentCard[^>]*disabled=\{false\}/);
});
