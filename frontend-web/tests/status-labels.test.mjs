import assert from 'node:assert/strict';
import test from 'node:test';
import * as web from '../src/localization/statusLabels.mjs';
import * as mobile from '../../frontend-mobile/src/localization/statusLabels.mjs';

const projectStatuses = ['DRAFT', 'UPLOADED', 'TRANSCRIBING', 'TRANSCRIBED', 'TRANSLATING', 'TRANSLATED', 'GENERATING_AUDIO', 'PROCESSING_VIDEO', 'COMPLETED', 'FAILED'];

test('Web project labels cover all backend ProjectStatus values', () => {
  assert.deepEqual(Object.keys(web.projectStatusLabels), projectStatuses);
  assert.equal(new Set(Object.values(web.projectStatusLabels)).size, projectStatuses.length);
});

test('Web and Mobile status dictionaries and workflow labels stay in parity', () => {
  assert.deepEqual(web.projectStatusLabels, mobile.projectStatusLabels);
  assert.deepEqual(web.transcriptStatusLabels, mobile.transcriptStatusLabels);
  assert.deepEqual(web.translationStatusLabels, mobile.translationStatusLabels);
  assert.deepEqual(web.voiceStatusLabels, mobile.voiceStatusLabels);
  assert.deepEqual(web.processingStatusLabels, mobile.processingStatusLabels);
  assert.deepEqual(web.workflowStepLabels, mobile.workflowStepLabels);
  assert.equal(web.workflowStepLabels.length, 6);
  assert.equal(web.workflowStepLabels.at(-1), 'Kết quả');
});
