import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { projectAction } from '../src/features/projects/projectAction.ts'

const uploadSource = await readFile(new URL('../src/features/projects/uploadService.ts', import.meta.url), 'utf8')
const detailSource = await readFile(new URL('../src/pages/ProjectDetailPage.tsx', import.meta.url), 'utf8')
const createSource = await readFile(new URL('../src/pages/NewProjectPlaceholder.tsx', import.meta.url), 'utf8')

const statusSteps = {
  DRAFT: 'UPLOAD', UPLOADED: 'TRANSCRIPT', TRANSCRIBING: 'TRANSCRIPT', TRANSCRIBED: 'TRANSLATION',
  TRANSLATING: 'TRANSLATION', TRANSLATED: 'VOICE', GENERATING_AUDIO: 'VOICE',
  PROCESSING_VIDEO: 'GENERATE', COMPLETED: 'RESULT', FAILED: 'GENERATE',
}

function project(status, step, overrides = {}) {
  const needsLanguage = ['VOICE', 'GENERATE', 'RESULT'].includes(step) || (step === 'TRANSLATION' && (status === 'TRANSLATING' || status === 'FAILED'))
  return {
    id: `project-${status.toLowerCase()}`, name: status, sourceLanguage: 'vi', status,
    createdAt: '2026-10-18T00:00:00.000Z', updatedAt: '2026-10-18T00:00:00.000Z',
    workflow: {
      step, state: step === 'RESULT' ? 'COMPLETED' : status === 'FAILED' ? 'FAILED' : status.endsWith('ING') || status === 'GENERATING_AUDIO' || status === 'PROCESSING_VIDEO' ? 'PROCESSING' : 'READY',
      canResume: true, mediaType: status === 'DRAFT' ? null : 'AUDIO',
      targetLanguage: needsLanguage ? { code: 'en', source: status === 'COMPLETED' ? 'RESULT' : 'JOB' } : null,
      processing: null, failure: null, artifact: { narrationReady: step === 'RESULT', resultReady: false }, ...overrides,
    },
  }
}

test('all ten ProjectStatus values navigate from backend workflow instead of status guesses', () => {
  for (const [status, step] of Object.entries(statusSteps)) {
    const action = projectAction(project(status, step))
    assert.equal(action.available, true, status)
    assert.equal(action.step, step.toLowerCase(), status)
  }
})

test('missing, unknown and blocked workflow fail closed on Project Detail', () => {
  const missing = projectAction({ ...project('DRAFT', 'UPLOAD'), workflow: undefined })
  const unknown = projectAction(project('FAILED', 'UNKNOWN', { state: 'BLOCKED', canResume: false }))
  const inconsistentResult = projectAction(project('COMPLETED', 'RESULT', { state: 'READY' }))
  for (const action of [missing, unknown, inconsistentResult]) {
    assert.equal(action.available, false)
    assert.equal(action.path.includes('/transcript'), false)
    assert.equal(action.path.includes('/generate'), false)
  }
})

test('FAILED navigation follows the explicit workflow failure stage without triggering retry', () => {
  const paths = ['TRANSCRIPT', 'TRANSLATION', 'VOICE', 'GENERATE'].map(step => projectAction(project('FAILED', step)).path)
  assert.deepEqual(paths, [
    '/projects/project-failed/transcript', '/projects/project-failed/translation?language=en',
    '/projects/project-failed/voice?language=en', '/projects/project-failed/generate?language=en',
  ])
  assert.doesNotMatch(detailSource, /processing\.retry\(/)
})

test('target language follows trusted workflow provenance without a frontend language allowlist', () => {
  assert.equal(projectAction(project('TRANSLATED', 'VOICE', { targetLanguage: { code: 'en', source: 'TRANSLATION' } })).available, true)
  assert.equal(projectAction(project('TRANSLATED', 'VOICE', { targetLanguage: { code: 'zh', source: 'TRANSLATION' } })).available, true)
  assert.equal(projectAction(project('TRANSLATED', 'VOICE', { targetLanguage: { code: 'fr', source: 'TRANSLATION' } })).available, true)
  assert.equal(projectAction(project('TRANSLATED', 'VOICE', { targetLanguage: null })).available, false)
  assert.equal(projectAction(project('TRANSLATED', 'VOICE', { targetLanguage: { code: 'bad code', source: 'TRANSLATION' } })).available, false)
})

test('DRAFT resume uploads to the existing id and never invokes create-project cleanup', () => {
  const dedicated = uploadSource.slice(uploadSource.indexOf('export async function uploadMediaToProject'), uploadSource.indexOf('export async function uploadProjectMedia'))
  assert.match(dedicated, /\/projects\/\$\{encodeURIComponent\(projectId\)\}\/media/)
  assert.doesNotMatch(dedicated, /method: 'DELETE'/)
  assert.doesNotMatch(dedicated, /api<CreatedProject>\('\/projects'/)
  assert.match(detailSource, /project\.workflow\?\.step === 'UPLOAD'/)
  assert.match(detailSource, /uploadLock\.current/)
  assert.match(createSource, /uploadProjectMedia\(/)
})

test('navigation and opening Project Detail do not start workflow mutations', () => {
  assert.doesNotMatch(detailSource, /\.generate\(|\.translate\(|\.start\(|processing\.retry/)
  assert.match(detailSource, /onClick=\{\(\) => void resumeUpload\(\)\}/)
})
