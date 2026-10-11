import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { projectListLanguage, projectListLanguagePair, projectListPage } from '../src/features/projects/projectListPresentation.ts'
import { createDemoProjects } from '../src/features/projects/projectDemo.ts'
test('Project List displays Vietnamese language labels without changing codes', () => {
  for (const [code, label] of Object.entries({ vi: 'Tiếng Việt', en: 'Tiếng Anh', ja: 'Tiếng Nhật', ko: 'Tiếng Hàn' })) assert.equal(projectListLanguage(code), label)
  const project = createDemoProjects()[0]
  assert.equal(projectListLanguagePair(project), 'Tiếng Việt → Chưa dịch')
  assert.equal(project.sourceLanguage, 'vi')
  assert.equal(projectListLanguage('fr'), new Intl.DisplayNames(['vi'], { type: 'language' }).of('fr'))
})
test('Pagination uses all 20 fixtures, clamps pages after filtering and calculates actual ranges', () => {
  const projects = createDemoProjects()
  const first = projectListPage(projects, 1), second = projectListPage(projects, 2)
  assert.deepEqual([first.from, first.to, first.total, first.totalPages], [1, 10, 20, 2])
  assert.deepEqual([second.from, second.to, second.projects.length], [11, 20, 10])
  assert.equal(projectListPage(projects.slice(0, 3), 2).page, 1)
  assert.deepEqual(projectListPage([], 10).projects, [])
  assert.equal(projectListPage([], 10).from, 0)
})
test('Compact table hides duplicate caption, retains full names and marks simulated statuses', async () => {
  const [page, css] = await Promise.all([readFile(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8'), readFile(new URL('../src/styles/project-list.css', import.meta.url), 'utf8')])
  assert.match(page, /<strong>Dữ liệu demo<\/strong> — Chỉ dùng để kiểm tra giao diện và bộ lọc, không thực hiện thao tác thật\./)
  assert.match(page, /title=\{project.name\}/)
  assert.match(page, /Giả lập · Không có tệp thật/)
  assert.match(page, /aria-current="page"/)
  assert.match(css, /\.project-list-table caption[^}]*clip-path/)
  assert.match(css, /-webkit-line-clamp: 2/)
  assert.match(css, /\.project-list-name:focus[^}]*-webkit-line-clamp: unset/)
})
