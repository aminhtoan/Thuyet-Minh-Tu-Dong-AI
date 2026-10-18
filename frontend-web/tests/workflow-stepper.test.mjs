import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolveWorkflowStepNavigation } from '../src/features/projects/workflowStepNavigation.ts';
import { workflowStepsPresentation } from '../src/features/projects/workflowStepsPresentation.ts';

const source = await readFile(new URL('../src/components/common/WorkflowSteps.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/workflow.css', import.meta.url), 'utf8');
const pageNames = ['Transcript', 'Translation', 'Voice', 'Generate', 'Result'];
const pages = await Promise.all(pageNames.map((name) => readFile(new URL(`../src/pages/${name}Page.tsx`, import.meta.url), 'utf8')));
const projectDetail = await readFile(new URL('../src/pages/ProjectDetailPage.tsx', import.meta.url), 'utf8');
const groupWorkspace = await readFile(new URL('../src/features/translation/GroupTranslationWorkspace.tsx', import.meta.url), 'utf8');
const navigationSource = await readFile(new URL('../src/features/projects/workflowStepNavigation.ts', import.meta.url), 'utf8');

const base = {
  step: 'TRANSLATION', state: 'READY', canResume: true, mediaType: 'AUDIO', targetLanguage: null,
  processing: null, failure: null, artifact: { narrationReady: false, resultReady: false },
};

test('trusted workflow produces completed, current and upcoming states without reading the URL', () => {
  const presentation = workflowStepsPresentation(base);
  assert.equal(presentation.activeIndex, 2);
  assert.deepEqual(presentation.steps, ['completed', 'completed', 'current', 'upcoming', 'upcoming', 'upcoming']);
  assert.equal(presentation.trustworthy, true);
  assert.match(source, /aria-current=\{isCurrent \? 'step'/);
  assert.doesNotMatch(source, /useLocation|useParams|window\.location/);
});

test('failed styling requires a matching backend failure job type', () => {
  const failedTranscript = workflowStepsPresentation({
    ...base, step: 'TRANSCRIPT', state: 'FAILED',
    failure: { jobId: 'job-1', type: 'TRANSCRIPTION', code: 'STT_TIMEOUT', failedAt: '2026-10-18T00:00:00.000Z' },
  });
  assert.deepEqual(failedTranscript.steps, ['completed', 'failed', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
  assert.match(failedTranscript.message, /Bước Bản ghi gặp lỗi/);

  const contradictory = workflowStepsPresentation({
    ...base, step: 'TRANSCRIPT', state: 'FAILED',
    failure: { jobId: 'job-2', type: 'TRANSLATION', code: 'TRANSLATION_TIMEOUT', failedAt: '2026-10-18T00:00:00.000Z' },
  });
  assert.equal(contradictory.trustworthy, false);
  assert.ok(contradictory.steps.every((state) => state === 'unknown'));
});

test('processing requires matching processing evidence and never invents provider progress', () => {
  const processing = workflowStepsPresentation({
    ...base, step: 'VOICE', state: 'PROCESSING',
    processing: { jobId: 'job-3', type: 'TTS', status: 'PROCESSING', progress: 0 },
  });
  assert.equal(processing.steps[3], 'processing');
  assert.match(processing.message, /Tiến độ chỉ được hiển thị khi máy chủ cung cấp/);

  const missingEvidence = workflowStepsPresentation({ ...base, step: 'VOICE', state: 'PROCESSING' });
  assert.equal(missingEvidence.trustworthy, false);
  assert.doesNotMatch(source, /workflow\.processing\.progress|style=.*progress/);
});

test('blocked, unknown and ambiguous failures stay neutral', () => {
  for (const workflow of [undefined, { ...base, step: 'UNKNOWN', state: 'BLOCKED' }, { ...base, step: 'TRANSCRIPT', state: 'FAILED' }]) {
    const presentation = workflowStepsPresentation(workflow);
    assert.equal(presentation.activeIndex, -1);
    assert.equal(presentation.state, 'UNKNOWN');
    assert.ok(presentation.steps.every((state) => state === 'unknown'));
    assert.match(presentation.message, /chưa cung cấp đủ bằng chứng/);
  }
});

test('completed Result needs a media-specific ready artifact', () => {
  const completed = workflowStepsPresentation({ ...base, step: 'RESULT', state: 'COMPLETED', artifact: { narrationReady: true, resultReady: false } });
  assert.equal(completed.activeIndex, 5);
  assert.ok(completed.steps.every((state) => state === 'completed'));
  const invalid = workflowStepsPresentation({ ...base, step: 'RESULT', state: 'COMPLETED' });
  assert.equal(invalid.trustworthy, false);
});

test('stepper keeps all six long labels readable, responsive and motion-safe', () => {
  for (const label of ['Tải lên', 'Bản ghi', 'Bản dịch', 'Giọng đọc', 'Tạo thuyết minh', 'Kết quả']) assert.ok(source.includes(label) || source.includes('workflowStepLabels'));
  assert.match(css, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.workflow-step__label \{[^}]*overflow-wrap: anywhere/s);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*min-width: 680px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  assert.match(source, /const accessibleLabel = `\$\{label\}: \$\{visualStateLabels\[visualState\]\}\. \$\{navigation\.reason\}`/);
});

test('navigation matrix keeps the same project and trusted target language', () => {
  const completed = {
    ...base,
    step: 'RESULT', state: 'COMPLETED', targetLanguage: { code: 'en', source: 'RESULT' },
    artifact: { narrationReady: true, resultReady: false },
  };
  const expected = new Map([
    ['UPLOAD', '/projects/project-42'],
    ['TRANSCRIPT', '/projects/project-42/transcript'],
    ['TRANSLATION', '/projects/project-42/translation?language=en'],
    ['VOICE', '/projects/project-42/voice?language=en'],
    ['GENERATE', '/projects/project-42/generate?language=en'],
    ['RESULT', '/projects/project-42/result?language=en'],
  ]);
  for (const [step, path] of expected) {
    const pageStep = step === 'RESULT' ? 'TRANSCRIPT' : 'RESULT';
    assert.deepEqual(resolveWorkflowStepNavigation(completed, 'project-42', step, pageStep), {
      enabled: true, path, reason: step === 'UPLOAD' ? 'Mở thông tin dự án và phương tiện nguồn.' : 'Mở bước này trong cùng dự án.',
    });
  }
});

test('current page does not navigate and upcoming steps remain disabled', () => {
  const current = resolveWorkflowStepNavigation(base, 'project-42', 'TRANSLATION', 'TRANSLATION');
  assert.equal(current.enabled, false);
  assert.equal(current.path, null);
  assert.match(current.reason, /đang xem/);
  const upcoming = resolveWorkflowStepNavigation(base, 'project-42', 'VOICE', 'TRANSLATION');
  assert.equal(upcoming.enabled, false);
  assert.match(upcoming.reason, /chưa sẵn sàng/);
});

test('failed and processing steps are clickable only with matching backend evidence', () => {
  const failed = resolveWorkflowStepNavigation({
    ...base, step: 'TRANSCRIPT', state: 'FAILED',
    failure: { jobId: 'job-1', type: 'TRANSCRIPTION', code: 'STT_TIMEOUT', failedAt: '2026-10-18T00:00:00.000Z' },
  }, 'project-42', 'TRANSCRIPT', 'UPLOAD');
  assert.equal(failed.path, '/projects/project-42/transcript');

  const processing = resolveWorkflowStepNavigation({
    ...base, state: 'PROCESSING', targetLanguage: { code: 'en', source: 'JOB' },
    processing: { jobId: 'job-2', type: 'TRANSLATION', status: 'PROCESSING', progress: 0 },
  }, 'project-42', 'TRANSLATION', 'TRANSCRIPT');
  assert.equal(processing.path, '/projects/project-42/translation?language=en');

  const ambiguousFailure = resolveWorkflowStepNavigation({ ...base, step: 'TRANSCRIPT', state: 'FAILED' }, 'project-42', 'TRANSCRIPT', 'UPLOAD');
  assert.equal(ambiguousFailure.enabled, false);
});

test('blocked, unknown, missing workflow and missing language fail closed', () => {
  const workflows = [undefined, { ...base, step: 'UNKNOWN', state: 'BLOCKED' }, { ...base, state: 'BLOCKED' }];
  for (const workflow of workflows) assert.equal(resolveWorkflowStepNavigation(workflow, 'project-42', 'TRANSCRIPT', 'UPLOAD').enabled, false);
  const missingLanguage = { ...base, step: 'VOICE', targetLanguage: null };
  assert.equal(resolveWorkflowStepNavigation(missingLanguage, 'project-42', 'VOICE', 'TRANSCRIPT').enabled, false);
  assert.match(resolveWorkflowStepNavigation(missingLanguage, 'project-42', 'VOICE', 'TRANSCRIPT').reason, /ngôn ngữ đích/);
});

test('clickable steps use semantic links, Enter and Space without bypassing guards or creating mutations', () => {
  assert.match(source, /<Link className="workflow-step__control"/);
  assert.match(source, /onKeyDown=\{activateLinkWithSpace\}/);
  assert.match(source, /event\.key !== ' '/);
  assert.match(source, /aria-disabled="true"/);
  assert.match(navigationSource, /resolveWorkflowRouteAccess\(workflow, destination\)/);
  assert.match(navigationSource, /workflowStepsPresentation\(workflow\)/);
  assert.doesNotMatch(source + navigationSource, /fetch\(|\.start\(|\.retry\(|\.generate\(|\.approve\(/);
});

test('all consumers pass backend workflow, project id and their explicit page step', () => {
  const expectedPageSteps = ['TRANSCRIPT', 'TRANSLATION', 'VOICE', 'GENERATE', 'RESULT'];
  pages.forEach((page, index) => assert.match(page, new RegExp(`<WorkflowSteps workflow=\\{project\\.workflow\\} projectId=\\{project\\.id\\} pageStep="${expectedPageSteps[index]}"`)));
  assert.match(projectDetail, /<WorkflowSteps workflow=\{project\.workflow\} projectId=\{project\.id\} pageStep="UPLOAD"/);
  assert.match(groupWorkspace, /<WorkflowSteps workflow=\{project\.workflow\} projectId=\{project\.id\} pageStep="TRANSLATION"/);
});
