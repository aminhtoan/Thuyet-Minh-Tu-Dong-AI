import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createDemoProjects, isProjectDemoEnabled } from '../src/features/projects/projectDemo.ts'
import { filterAndSortProjects } from '../src/features/projects/projectListFilters.ts'
const now = new Date(2026, 9, 11, 12)
const filters = { query: '', status: 'ALL', period: 'ALL', from: '', to: '', sort: 'NEWEST' }
test('Demo requires exact explicit flag and cannot be enabled in production', () => {
  for (const flag of [undefined, '', 'false', '1', true, 'TRUE']) assert.equal(isProjectDemoEnabled(true, flag), false)
  assert.equal(isProjectDemoEnabled(false, 'true'), false)
  assert.equal(isProjectDemoEnabled(true, 'true'), true)
})
test('20 fixtures have valid statuses and dates, but no fabricated media/results', () => {
  const projects = createDemoProjects(now)
  assert.equal(projects.length, 20)
  assert.equal(new Set(projects.map(project => project.id)).size, 20)
  const count = status => projects.filter(project => project.status === status).length
  assert.equal(count('DRAFT'), 4); assert.equal(count('UPLOADED'), 3); assert.equal(count('COMPLETED'), 6); assert.equal(count('FAILED'), 2)
  for (const project of projects) { assert.ok(Number.isFinite(Date.parse(project.createdAt))); assert.deepEqual(Object.keys(project).sort(), ['createdAt', 'description', 'id', 'name', 'sourceLanguage', 'status', 'updatedAt']) }
})
test('Full fixture set supports accent search, AND filters, local dates, sort and two pages', () => {
  const projects = createDemoProjects(now)
  assert.equal(filterAndSortProjects(projects, { ...filters, query: 'DA NANG' }, now)[0].name, 'Da Nang Travel')
  assert.equal(filterAndSortProjects(projects, { ...filters, query: 'DA NANG', status: 'FAILED' }, now).length, 0)
  assert.equal(filterAndSortProjects(projects, { ...filters, period: 'TODAY' }, now).length, 1)
  assert.equal(filterAndSortProjects(projects, { ...filters, period: 'WEEK' }, now).length, 7)
  assert.equal(filterAndSortProjects(projects, { ...filters, period: 'MONTH' }, now).length, 12)
  assert.equal(filterAndSortProjects(projects, { ...filters, period: 'CUSTOM', from: '2026-10-11', to: '2026-10-11' }, now).length, 1)
  for (const sort of ['NEWEST', 'OLDEST', 'NAME_ASC', 'NAME_DESC']) {
    const all = filterAndSortProjects(projects, { ...filters, sort }, now)
    assert.equal(all.slice(0, 10).length, 10); assert.equal(all.slice(10, 20).length, 10)
    assert.equal(new Set([...all.slice(0, 10), ...all.slice(10, 20)].map(project => project.id)).size, 20)
  }
})
test('Demo branch never mounts API loader and demo rows have no business links', async () => {
  const source = await readFile(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8')
  assert.match(source, /import\.meta\.env\.DEV && isProjectDemoEnabled/)
  const branch = source.slice(source.indexOf('function DemoProjectList()'), source.indexOf('function ProjectListView'))
  assert.doesNotMatch(branch, /useCompleteHistory|api\(|projectRepository/)
  assert.match(source, /demo\s*\? <span className="project-list-name"[^>]*>\{project\.name\}<\/span>\s*: <Link/)
  assert.match(source, /Chỉ xem demo/)
})
