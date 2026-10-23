import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { projectListLanguagePair } from '../src/features/projects/projectListPresentation.ts'

const source = await readFile(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/styles/project-list.css', import.meta.url), 'utf8')
const actionSource = await readFile(new URL('../src/features/projects/projectAction.ts', import.meta.url), 'utf8')

test('professional Projects table keeps six semantic columns with balanced name and action widths', () => {
  assert.match(source, /<table className="project-list-table">[\s\S]*?<colgroup>[\s\S]*?<\/colgroup>[\s\S]*?<thead>/)
  assert.equal((source.match(/<col className="project-list-column project-list-column--/g) ?? []).length, 6)
  assert.deepEqual(
    [...source.matchAll(/<th key=\{label\} scope="col">/g)].length,
    1,
  )
  assert.match(source, /\['Tên dự án', 'Phương tiện', 'Ngôn ngữ', 'Ngày tạo', 'Trạng thái', 'Thao tác'\]/)
  assert.match(css, /\.projects-page \.project-list-column--name \{[^}]*width: 32%/s)
  assert.match(css, /\.projects-page \.project-list-column--action \{[^}]*width: 16%/s)
  assert.match(css, /\.projects-page \.project-list-table \{[^}]*table-layout: fixed/s)
  assert.match(css, /\.projects-page \.project-list-table \{[^}]*min-width: 0/s)
})

test('long duplicate and Unicode project names remain intact and receive a distinguishing accessible name', () => {
  const unicodeName = 'Thuyết minh tiếng Việt — Khoa Công nghệ thông tin'
  assert.equal(unicodeName.normalize('NFC'), unicodeName)
  assert.match(source, /title=\{project\.name\}/)
  assert.match(source, /projectAccessibleName = `\$\{project\.name\}, tạo ngày \$\{createdDate\}, trạng thái \$\{projectStatusLabels\[project\.status\]\}, mã \$\{project\.id\}`/)
  assert.match(source, /aria-label=\{`Mở dự án \$\{projectAccessibleName\}`\}/)
  assert.match(css, /\.projects-page \.project-list-table \.project-list-name \{[^}]*-webkit-line-clamp: 2/s)
  assert.match(css, /\.projects-page \.project-list-name:focus \{[^}]*-webkit-line-clamp: unset/s)
})

test('media cells use verified media types and keep an explicit unknown fallback', () => {
  assert.match(source, /mediaType === 'VIDEO'[\s\S]*?<Icon name="video"/)
  assert.match(source, /mediaType === 'AUDIO'[\s\S]*?<Icon name="wave"/)
  assert.match(source, /state === 'ERROR'[\s\S]*?>Không tải được thông tin</)
  assert.match(source, /state === 'UNKNOWN'[\s\S]*?>Chưa xác định</)
  assert.match(source, /project-list-media project-list-media--empty">Chưa có tệp/)
  assert.doesNotMatch(source, /mediaType \? 'Video'/)
})

test('language pairs and all existing status mappings remain presentation-only', () => {
  const pair = projectListLanguagePair({
    id: 'unicode-project', name: 'Dự án tiếng Việt', sourceLanguage: 'vi', targetLanguage: 'en',
    status: 'TRANSLATED', createdAt: '2026-10-17T00:00:00.000Z', updatedAt: '2026-10-17T00:00:00.000Z',
  })
  assert.equal(pair, 'Tiếng Việt → Tiếng Anh')
  assert.match(source, /<ProjectStatusBadge status=\{project\.status\}/)
  assert.match(css, /\.projects-page \.project-list-status \.badge \{/)
})

test('the action uses the verified workflow path without implying an automatic mutation', () => {
  assert.match(source, /const action = projectAction\(project\)/)
  assert.match(source, /to=\{action\.path\}/)
  assert.match(source, /<span>\{action\.label\}<\/span><Icon name="arrow"/)
  assert.match(actionSource, /workflow\.state === 'FAILED' \? 'Mở bước gặp lỗi'/)
  assert.doesNotMatch(actionSource, /project\.status ===/)
  assert.match(css, /\.projects-page \.project-list-action \{[^}]*max-width: 100%;[^}]*white-space: normal/s)
  assert.match(css, /\.projects-page \.project-list-action span \{[^}]*overflow-wrap: anywhere/s)
})

test('desktop table fits its container while narrow screens keep local scrolling', () => {
  assert.match(source, /role="region" aria-label="Danh sách dự án"/)
  assert.match(source, /<caption className="sr-only">Dự án của tôi<\/caption>/)
  assert.match(css, /\.projects-page \.project-list-table-scroll \{[^}]*overflow-x: auto/s)
  assert.match(css, /\.projects-page \.project-list-table-scroll:focus-visible/)
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.projects-page \.project-list-table \{[^}]*min-width: 760px/s)
  assert.doesNotMatch(css, /^\.project-list-action\b/m)
})

test('pagination keeps navigation controls without the redundant result-count line', () => {
  assert.doesNotMatch(source, /Hiển thị \{pagination\.from\}–\{pagination\.to\} \/ \{pagination\.total\} dự án/)
  assert.match(source, /Trang \{pagination\.page\} \/ \{pagination\.totalPages\}/)
  assert.match(css, /\.projects-page \.project-pagination \{[^}]*justify-content: center/s)
})
