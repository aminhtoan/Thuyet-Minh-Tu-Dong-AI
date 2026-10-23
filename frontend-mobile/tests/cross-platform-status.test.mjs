import assert from 'node:assert/strict';
import test from 'node:test';
import * as mobile from '../src/localization/statusLabels.mjs';
import * as web from '../../frontend-web/src/localization/statusLabels.mjs';

const projectStatuses = ['DRAFT', 'UPLOADED', 'TRANSCRIBING', 'TRANSCRIBED', 'TRANSLATING', 'TRANSLATED', 'GENERATING_AUDIO', 'PROCESSING_VIDEO', 'COMPLETED', 'FAILED'];
const transcriptStates = ['LOADING', 'NOT_STARTED', 'GENERATING', 'READY', 'SAVING', 'SAVED', 'FAILED'];
const translationStates = ['LOADING', 'NOT_STARTED', 'TRANSLATING', 'READY', 'SAVING', 'SAVED', 'FAILED'];
const voiceStates = ['LOADING', 'READY', 'SAVING', 'SAVED', 'FAILED'];
const processingStates = ['WAITING', 'STARTING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];

test('status dictionaries cover every current frontend state', () => {
  assert.deepEqual(Object.keys(mobile.projectStatusLabels), projectStatuses);
  assert.deepEqual(Object.keys(mobile.transcriptStatusLabels), transcriptStates);
  assert.deepEqual(Object.keys(mobile.translationStatusLabels), translationStates);
  assert.deepEqual(Object.keys(mobile.voiceStatusLabels), voiceStates);
  assert.deepEqual(Object.keys(mobile.processingStatusLabels), processingStates);
});

test('Web and Mobile use exactly the same Vietnamese status terminology', () => {
  const webLabels = { ...web }, mobileLabels = { ...mobile };
  for (const key of ['projectStatusLabels', 'transcriptStatusLabels', 'translationStatusLabels', 'voiceStatusLabels', 'processingStatusLabels']) {
    assert.deepEqual(webLabels[key], mobileLabels[key], `${key} differs between Web and Mobile`);
  }
});

test('workflow contains the same six ordered labels and includes Kết quả', () => {
  const expected = ['Tải lên', 'Bản ghi', 'Bản dịch', 'Giọng đọc', 'Tạo thuyết minh', 'Kết quả'];
  assert.deepEqual([...mobile.workflowStepLabels], expected);
  assert.deepEqual(web.workflowStepLabels, mobile.workflowStepLabels);
});
