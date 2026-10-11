import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pages = Object.fromEntries(await Promise.all(['Transcript', 'Translation', 'Voice', 'Generate', 'Result'].map(async (name) => [name, await readFile(new URL(`../src/pages/${name}Page.tsx`, import.meta.url), 'utf8')])));
const stage = await readFile(new URL('../src/features/processing/ProcessingStage.tsx', import.meta.url), 'utf8');

test('workflow screens retain all six workflow stages and paid-action service guards', () => {
  for (const step of ['transcript', 'translation', 'voice', 'generate', 'result']) assert.match(pages[step[0].toUpperCase() + step.slice(1)], new RegExp(`WorkflowSteps current="${step}"`));
  assert.match(pages.Transcript, /editor\.generate/);
  assert.match(pages.Translation, /editor\.translate/);
  assert.match(pages.Voice, /editor\.save/);
});

test('technical processing and editor statuses use Vietnamese dictionaries', () => {
  assert.match(pages.Translation, /translationStatusLabels\[editor\.status\]/);
  assert.match(pages.Voice, /voiceStatusLabels\[editor\.status\]/);
  assert.match(pages.Generate, /processingStatusLabels\[snapshot\.status\]/);
  assert.match(stage, /processingStatusLabels\[stage\.status\]/);
});

test('read-only transcript and translation do not advertise unsupported editing', () => {
  assert.match(pages.Transcript, /Xem từng phân đoạn/);
  assert.match(pages.Translation, /chế độ chỉ đọc/);
});

test('result playback and download stay on protected locally loaded media', () => {
  assert.match(pages.Result, /useResult/);
  assert.match(pages.Result, /mediaUrl/);
  assert.match(pages.Result, /download=/);
  assert.doesNotMatch(pages.Result, /Authorization=/);
});
