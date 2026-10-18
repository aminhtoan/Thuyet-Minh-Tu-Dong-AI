import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolveWorkflowRouteAccess } from '../src/features/projects/workflowRouteGuard.ts';

const base = {
  step: 'TRANSLATION', state: 'READY', canResume: true, mediaType: 'AUDIO',
  targetLanguage: null, processing: null, failure: null,
  artifact: { narrationReady: false, resultReady: false },
};

test('deep links allow the current step, allow prior artifacts read-only, and block future steps', () => {
  assert.deepEqual(resolveWorkflowRouteAccess(base, 'TRANSLATION'), { allowed: true, canMutate: true, targetLanguage: null, reason: null });
  const prior = resolveWorkflowRouteAccess(base, 'TRANSCRIPT');
  assert.equal(prior.allowed, true); assert.equal(prior.canMutate, false);
  assert.equal(resolveWorkflowRouteAccess(base, 'VOICE').allowed, false);
});

test('processing is view-only; failed can resume only when the backend allows it', () => {
  const processing = resolveWorkflowRouteAccess({ ...base, state: 'PROCESSING', targetLanguage: { code: 'en', source: 'JOB' } }, 'TRANSLATION', 'en');
  assert.equal(processing.allowed, true); assert.equal(processing.canMutate, false); assert.match(processing.reason, /đang được xử lý/);
  assert.equal(resolveWorkflowRouteAccess({ ...base, state: 'FAILED', canResume: true, targetLanguage: { code: 'en', source: 'JOB' } }, 'TRANSLATION', 'en').canMutate, true);
  assert.equal(resolveWorkflowRouteAccess({ ...base, state: 'FAILED', canResume: false, targetLanguage: { code: 'en', source: 'JOB' } }, 'TRANSLATION', 'en').canMutate, false);
});

test('missing, blocked and unknown workflow fail closed without redirecting', async () => {
  assert.equal(resolveWorkflowRouteAccess(undefined, 'TRANSCRIPT').allowed, false);
  assert.equal(resolveWorkflowRouteAccess({ ...base, step: 'UNKNOWN' }, 'TRANSCRIPT').allowed, false);
  assert.equal(resolveWorkflowRouteAccess({ ...base, state: 'BLOCKED' }, 'TRANSCRIPT').allowed, false);
  const recovery = await readFile(new URL('../src/components/common/WorkflowRouteGuard.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(recovery, /Navigate|window\.location/);
  assert.match(recovery, /headingRef\.current\?\.focus/);
});

test('result viewing requires a verified media-specific artifact even when canResume is false', () => {
  const result = { ...base, step: 'RESULT', state: 'COMPLETED', canResume: false, targetLanguage: { code: 'fr', source: 'RESULT' } };
  assert.equal(resolveWorkflowRouteAccess({ ...result, artifact: { narrationReady: true, resultReady: false } }, 'RESULT', 'fr').allowed, true);
  assert.equal(resolveWorkflowRouteAccess({ ...result, mediaType: 'VIDEO', artifact: { narrationReady: true, resultReady: false } }, 'RESULT', 'fr').allowed, false);
  assert.equal(resolveWorkflowRouteAccess({ ...result, mediaType: 'VIDEO', artifact: { narrationReady: false, resultReady: true } }, 'RESULT', 'fr').allowed, true);
});

test('trusted workflow language accepts catalog codes and rejects invalid or conflicting deep links', () => {
  const workflow = { ...base, step: 'VOICE', targetLanguage: { code: 'zh', source: 'TRANSLATION' } };
  assert.equal(resolveWorkflowRouteAccess(workflow, 'VOICE', 'zh').targetLanguage, 'zh');
  assert.equal(resolveWorkflowRouteAccess({ ...workflow, targetLanguage: { code: 'fr', source: 'TRANSLATION' } }, 'VOICE', 'fr').allowed, true);
  assert.equal(resolveWorkflowRouteAccess(workflow, 'VOICE', 'en').allowed, false);
  assert.equal(resolveWorkflowRouteAccess(workflow, 'VOICE', 'bad code').allowed, false);
  assert.equal(resolveWorkflowRouteAccess({ ...workflow, targetLanguage: { code: 'zh', source: 'UNTRUSTED' } }, 'VOICE', 'zh').allowed, false);
});

test('workflow pages guard before mutation and preserve catalog/TTS capability separation', async () => {
  const files = await Promise.all(['TranscriptPage.tsx', 'TranslationPage.tsx', 'VoicePage.tsx', 'GeneratePage.tsx', 'ResultPage.tsx']
    .map(name => readFile(new URL(`../src/pages/${name}`, import.meta.url), 'utf8')));
  for (const source of files) assert.match(source, /resolveWorkflowRouteAccess/);
  assert.match(files[0], /canGenerate = canMutate/);
  assert.match(files[1], /disabled=\{!canMutate/);
  assert.match(files[2], /disabled=\{!canMutate \|\| !editor\.canSave\}/);
  assert.match(files[3], /disabled=\{!canMutate \|\| !confirmed\}/);
  assert.doesNotMatch(files[4], /isLanguageCode/);
  const voiceService = await readFile(new URL('../src/features/voice/voiceService.ts', import.meta.url), 'utf8');
  assert.match(voiceService, /\/voices\?language=/);
  assert.match(voiceService, /response\.voices\.map/);
});
