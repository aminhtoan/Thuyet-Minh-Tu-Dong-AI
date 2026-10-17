import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveProjectWorkflow } from '../src/services/project-workflow.service.js';
import { resolveTtsTerminalStatus } from '../src/services/tts/tts-terminal-state.js';

const validAudio = {
  mediaType: 'AUDIO' as const,
  ttsSucceeded: true,
  narrationReady: true,
  narrationProjectMatches: true,
  hasConflictingActiveJob: false,
};

test('audio TTS success reaches COMPLETED only with a matching READY narration', () => {
  assert.equal(resolveTtsTerminalStatus(validAudio), 'COMPLETED');
  assert.equal(resolveTtsTerminalStatus({ ...validAudio, ttsSucceeded: false }), null);
  assert.equal(resolveTtsTerminalStatus({ ...validAudio, narrationReady: false }), null);
  assert.equal(resolveTtsTerminalStatus({ ...validAudio, narrationProjectMatches: false }), null);
  assert.equal(resolveTtsTerminalStatus({ ...validAudio, mediaType: null }), null);
});

test('video TTS success remains GENERATING_AUDIO until a valid Result exists', () => {
  assert.equal(resolveTtsTerminalStatus({ ...validAudio, mediaType: 'VIDEO' }), 'GENERATING_AUDIO');
  const withoutResult = resolveProjectWorkflow({ id: 'project', status: 'COMPLETED' }, {
    media: { projectId: 'project', mediaType: 'VIDEO' }, transcript: null, translations: [],
    narrations: [{ id: 'narration', projectId: 'project', languageCode: 'en' }], results: [], latestJob: null,
  });
  assert.equal(withoutResult.step, 'UNKNOWN');
  assert.equal(withoutResult.state, 'BLOCKED');
  const withResult = resolveProjectWorkflow({ id: 'project', status: 'COMPLETED' }, {
    media: { projectId: 'project', mediaType: 'VIDEO' }, transcript: null, translations: [],
    narrations: [{ id: 'narration', projectId: 'project', languageCode: 'en' }],
    results: [{ projectId: 'project', languageCode: 'en' }], latestJob: null,
  });
  assert.equal(withResult.step, 'RESULT');
  assert.equal(withResult.state, 'COMPLETED');
});

test('active conflicting work delays the audio terminal transition', () => {
  assert.equal(resolveTtsTerminalStatus({ ...validAudio, hasConflictingActiveJob: true }), 'GENERATING_AUDIO');
  assert.equal(resolveTtsTerminalStatus(validAudio), 'COMPLETED');
});

test('terminal decision is deterministic for duplicate completion', () => {
  assert.equal(resolveTtsTerminalStatus(validAudio), 'COMPLETED');
  assert.equal(resolveTtsTerminalStatus(validAudio), 'COMPLETED');
});
