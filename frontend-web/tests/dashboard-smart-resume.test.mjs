import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { resolveDashboardResume } from '../src/features/projects/dashboardResume.mjs'
import { projectAction } from '../src/features/projects/projectAction.ts'

const dashboardSource = await readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8')
const detailSource = await readFile(new URL('../src/pages/ProjectDetailPage.tsx', import.meta.url), 'utf8')
const repositorySource = await readFile(new URL('../src/features/projects/projectRepository.ts', import.meta.url), 'utf8')
const apiSource = await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8')

function project(step, overrides = {}) {
  const needsLanguage = ['VOICE', 'GENERATE', 'RESULT'].includes(step)
  return {
    id: 'project-1',
    name: 'Dự án điều hướng',
    sourceLanguage: 'vi',
    status: step === 'RESULT' ? 'COMPLETED' : 'TRANSCRIBED',
    createdAt: '2026-10-19T00:00:00.000Z',
    updatedAt: '2026-10-19T00:00:00.000Z',
    workflow: {
      step,
      state: step === 'RESULT' ? 'COMPLETED' : 'READY',
      canResume: true,
      mediaType: 'AUDIO',
      targetLanguage: needsLanguage ? { code: 'en', source: step === 'RESULT' ? 'RESULT' : 'TRANSLATION' } : null,
      processing: null,
      failure: null,
      artifact: { narrationReady: step === 'RESULT', resultReady: false },
      ...overrides,
    },
  }
}

test('Dashboard smart resume covers all six workflow destinations through projectAction', async () => {
  const expected = {
    UPLOAD: '/projects/project-1',
    TRANSCRIPT: '/projects/project-1/transcript',
    TRANSLATION: '/projects/project-1/translation',
    VOICE: '/projects/project-1/voice?language=en',
    GENERATE: '/projects/project-1/generate?language=en',
    RESULT: '/projects/project-1/result?language=en',
  }

  for (const [step, path] of Object.entries(expected)) {
    const current = project(step, step === 'UPLOAD' ? { mediaType: null } : {})
    const destination = await resolveDashboardResume(current.id, async () => current, projectAction)
    assert.equal(destination.path, path, step)
    assert.equal(destination.resumed, true, step)
    assert.equal(destination.label, 'Tiếp tục', step)
    assert.equal(destination.notice, null, step)
  }
})

test('UNKNOWN, BLOCKED, missing workflow and canResume=false fail closed to Project Detail', async () => {
  const cases = [
    project('UNKNOWN', { state: 'BLOCKED', canResume: false }),
    project('TRANSLATION', { state: 'BLOCKED', canResume: false }),
    { ...project('TRANSLATION'), workflow: undefined },
    project('TRANSLATION', { canResume: false }),
  ]

  for (const current of cases) {
    const destination = await resolveDashboardResume(current.id, async () => current, projectAction)
    assert.equal(destination.path, '/projects/project-1')
    assert.equal(destination.resumed, false)
    assert.equal(destination.label, 'Xem chi tiết')
    assert.equal(typeof destination.notice, 'string')
  }
})

test('API failure and mismatched response never navigate to a workflow route', async () => {
  const failed = await resolveDashboardResume('project-1', async () => { throw new Error('network') }, projectAction)
  const mismatched = await resolveDashboardResume('project-1', async () => ({ ...project('TRANSLATION'), id: 'another-project' }), projectAction)
  assert.equal(failed.path, '/projects/project-1')
  assert.equal(failed.resumed, false)
  assert.match(failed.notice, /máy chủ/)
  assert.equal(mismatched.path, '/projects/project-1')
  assert.equal(mismatched.resumed, false)
})

test('pending request times out, aborts transport and falls back instead of spinning forever', async () => {
  let transportAborted = false
  const startedAt = Date.now()
  const destination = await resolveDashboardResume(
    'project-1',
    (_projectId, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        transportAborted = true
        reject(signal.reason)
      }, { once: true })
    }),
    projectAction,
    { timeoutMs: 15 },
  )

  assert.equal(transportAborted, true)
  assert.equal(destination.path, '/projects/project-1')
  assert.equal(destination.resumed, false)
  assert.match(destination.notice, /phản hồi quá lâu/)
  assert.ok(Date.now() - startedAt < 500, 'timeout must settle promptly')
})

test('external cancellation rejects without creating a fallback navigation', async () => {
  const controller = new AbortController()
  const pending = resolveDashboardResume(
    'project-1',
    (_projectId, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    }),
    projectAction,
    { signal: controller.signal, timeoutMs: 1_000 },
  )
  controller.abort(new DOMException('Unmounted', 'AbortError'))
  await assert.rejects(pending, /Unmounted/)
})

test('missing project id returns to Projects without issuing a request', async () => {
  let requestCount = 0
  const destination = await resolveDashboardResume('', async () => { requestCount += 1; return project('UPLOAD') }, projectAction)
  assert.equal(requestCount, 0)
  assert.equal(destination.path, '/projects')
  assert.equal(destination.resumed, false)
})

test('Dashboard refreshes workflow, blocks double clicks and preserves safe detail access', () => {
  assert.match(dashboardSource, /projectRepository\.getProjectForResume\(projectId, signal\)/)
  assert.match(dashboardSource, /projectAction/)
  assert.match(dashboardSource, /resumeLock\.current/)
  assert.match(dashboardSource, /mountedRef\.current/)
  assert.match(dashboardSource, /useEffect\(\(\) => \{[\s\S]*mountedRef\.current = true;[\s\S]*mountedRef\.current = false;/)
  assert.match(dashboardSource, /requestControllerRef\.current\?\.abort\(\)/)
  assert.match(dashboardSource, /finally \{/)
  assert.match(dashboardSource, /loading=\{loading\}/)
  assert.match(dashboardSource, /Không thể mở dự án\. Vui lòng thử lại\./)
  assert.match(dashboardSource, /<strong><Link to=\{`\/projects\/\$\{project\.id\}`\}/)
  assert.match(detailSource, /resumeNavigationNotice/)
  assert.match(detailSource, /Đã mở trang chi tiết an toàn/)
})

test('resume fetch requests only the Project DTO and auth refresh is bounded', () => {
  const resumeMethod = repositorySource.slice(
    repositorySource.indexOf('async getProjectForResume'),
    repositorySource.indexOf('async updateProject'),
  )
  assert.match(resumeMethod, /api<\{ project: ProjectDto \}>\(`\/projects\/\$\{id\}`/)
  assert.match(resumeMethod, /\{ signal \}/)
  assert.doesNotMatch(resumeMethod, /enrich\(/)
  assert.match(apiSource, /AUTH_REFRESH_TIMEOUT_MS = 15_000/)
  assert.match(apiSource, /signal: AbortSignal\.timeout\(AUTH_REFRESH_TIMEOUT_MS\)/)
  assert.match(apiSource, /catch \{ session\.clear\(\); return false \}/)
})
