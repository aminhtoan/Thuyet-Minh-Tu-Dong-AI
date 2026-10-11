import type { Project } from './types'

const languageLabels: Record<string, string> = { vi: 'Tiếng Việt', en: 'Tiếng Anh', ja: 'Tiếng Nhật', ko: 'Tiếng Hàn' }
const displayNames = new Intl.DisplayNames(['vi'], { type: 'language' })
export function projectListLanguage(code: string) {
  const normalized = code.toLowerCase()
  if (languageLabels[normalized]) return languageLabels[normalized]
  try { return displayNames.of(normalized) ?? code.toUpperCase() } catch { return code.toUpperCase() }
}
export function projectListLanguagePair(project: Project) {
  return `${projectListLanguage(project.sourceLanguage)} → ${project.targetLanguage ? projectListLanguage(project.targetLanguage) : 'Chưa dịch'}`
}
export function projectListPage(items: readonly Project[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / 10))
  const page = Math.min(Math.max(1, Number.isInteger(requestedPage) ? requestedPage : 1), totalPages)
  return { projects: items.slice((page - 1) * 10, page * 10), page, totalPages, total: items.length, from: items.length ? (page - 1) * 10 + 1 : 0, to: Math.min(page * 10, items.length) }
}
