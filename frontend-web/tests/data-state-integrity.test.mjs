import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  collectionDataState,
  hasIncompleteProjectMetadata,
  mediaDataState,
  projectMetadataState,
  translationDataState,
} from '../src/features/projects/projectDataState.ts'
import { projectListLanguagePair } from '../src/features/projects/projectListPresentation.ts'

const project = (metadataState) => ({
  id: 'project-1', name: 'Dự án', sourceLanguage: 'vi', status: 'DRAFT',
  createdAt: '2026-10-18T00:00:00.000Z', updatedAt: '2026-10-18T00:00:00.000Z', metadataState,
})

test('collection contract never reports an API failure as EMPTY', () => {
  assert.equal(collectionDataState(true, null, 0), 'LOADING')
  assert.equal(collectionDataState(false, 'Mất kết nối', 0), 'ERROR')
  assert.equal(collectionDataState(false, null, 0), 'EMPTY')
  assert.equal(collectionDataState(false, null, 2), 'READY')
})

test('media state only treats the verified MEDIA_NOT_FOUND code as EMPTY', () => {
  assert.equal(mediaDataState({ status: 'fulfilled', value: { mediaType: 'AUDIO' } }), 'READY')
  assert.equal(mediaDataState({ status: 'fulfilled', value: null }), 'UNKNOWN')
  assert.equal(mediaDataState({ status: 'rejected', reason: { code: 'MEDIA_NOT_FOUND' } }), 'EMPTY')
  assert.equal(mediaDataState({ status: 'rejected', reason: { code: 'NETWORK_ERROR' } }), 'ERROR')
})

test('translation success, confirmed empty and failure remain distinct', () => {
  assert.equal(translationDataState({ status: 'fulfilled', value: [{ targetLanguage: 'en' }] }), 'READY')
  assert.equal(translationDataState({ status: 'fulfilled', value: [] }), 'EMPTY')
  assert.equal(translationDataState({ status: 'fulfilled', value: undefined }), 'UNKNOWN')
  assert.equal(translationDataState({ status: 'rejected', reason: new Error('offline') }), 'ERROR')
})

test('presentation distinguishes missing, failed and unknown translation metadata', () => {
  assert.match(projectListLanguagePair(project({ media: 'EMPTY', translation: 'EMPTY' })), /Chưa dịch$/)
  assert.match(projectListLanguagePair(project({ media: 'READY', translation: 'ERROR' })), /Không tải được bản dịch$/)
  assert.match(projectListLanguagePair(project({ media: 'READY', translation: 'UNKNOWN' })), /Chưa xác định$/)
  assert.deepEqual(projectMetadataState(project()), { media: 'UNKNOWN', translation: 'UNKNOWN' })
})

test('one enrichment failure preserves other projects and marks the dataset incomplete', () => {
  const complete = project({ media: 'READY', translation: 'EMPTY' })
  const partial = { ...project({ media: 'ERROR', translation: 'READY' }), id: 'project-2' }
  assert.equal(hasIncompleteProjectMetadata([complete, partial]), true)
  assert.equal(hasIncompleteProjectMetadata([complete]), false)
  assert.equal([complete, partial].length, 2)
})

test('Projects, Dashboard and History expose partial-data feedback without replacing rows', async () => {
  const [repository, projectsPage, dashboardPage, historyPage] = await Promise.all([
    readFile(new URL('../src/features/projects/projectRepository.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/ProjectsPlaceholder.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/HistoryPlaceholder.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(repository, /metadataState: \{ media: mediaState, translation: translationState \}/)
  assert.match(repository, /Promise\.allSettled/)
  for (const source of [projectsPage, dashboardPage, historyPage]) {
    assert.match(source, /Dữ liệu chưa đầy đủ/)
    assert.match(source, /role="status"/)
  }
  assert.match(projectsPage, /<ProjectMedia project=\{project\}/)
  assert.match(historyPage, /visible\.map/)
  assert.match(historyPage, /libraryProduct\(project\)/)
})
