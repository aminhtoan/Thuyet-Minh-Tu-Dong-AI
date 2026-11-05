import type { Project, SourceLanguageMode } from './types'

export const manualSourceOptions = [
  { value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'Tiếng Anh' },
  { value: 'ja', label: 'Tiếng Nhật' }, { value: 'ko', label: 'Tiếng Hàn' },
  { value: 'zh', label: 'Tiếng Trung (giản thể)' },
] as const

export function sourceState(project: Pick<Project, 'sourceLanguage' | 'sourceLanguageMode' | 'sourceLanguageStatus' | 'detectedSourceLanguage'>) {
  const mode = project.sourceLanguageMode ?? 'MANUAL'
  const status = project.sourceLanguageStatus ?? (mode === 'MANUAL' && project.sourceLanguage ? 'CONFIRMED' : 'PENDING_DETECTION')
  const confirmed = status === 'CONFIRMED' && Boolean(project.sourceLanguage) && !['auto', 'unknown'].includes(project.sourceLanguage ?? '')
  return { mode, status, confirmed, language: confirmed ? project.sourceLanguage : null, detected: project.detectedSourceLanguage || null }
}

export function sourceLanguageLabel(code?: string | null): string {
  if (!code || ['auto', 'unknown'].includes(code)) return 'Chưa xác định'
  return manualSourceOptions.find(option => option.value === code)?.label ?? code.toUpperCase()
}

export const sourceStatusLabels = {
  PENDING_DETECTION: 'Chờ nhận diện', NEEDS_CONFIRMATION: 'Cần xác nhận', CONFIRMED: 'Đã xác nhận',
}

export function createSourcePayload(mode: SourceLanguageMode, language?: string | null) {
  if (mode === 'AUTO') return { sourceLanguageMode: 'AUTO' as const }
  if (!manualSourceOptions.some(option => option.value === language)) throw new Error('Vui lòng chọn ngôn ngữ nguồn hợp lệ.')
  return { sourceLanguageMode: 'MANUAL' as const, sourceLanguage: language! }
}

// Backend intentionally blocks TRANSLATION until source confirmation. The prior
// transcript must remain readable so the owner can make that confirmation.
export function canReviewUnconfirmedSource(project: Project): boolean {
  const source = sourceState(project)
  return source.mode === 'AUTO' && source.status === 'NEEDS_CONFIRMATION' && !source.confirmed
    && project.workflow?.step === 'TRANSLATION' && project.workflow.state === 'BLOCKED'
}
