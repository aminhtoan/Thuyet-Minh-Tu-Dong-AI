import { api } from '../../lib/api'
import { manualSourceOptions } from './sourceLanguage'

export const sourceLanguageService = {
  async confirm(projectId: string, sourceLanguage: string, expectedRevision: number, signal?: AbortSignal) {
    if (!manualSourceOptions.some(option => option.value === sourceLanguage) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new Error('Cần chọn ngôn ngữ và tải bản ghi có revision hợp lệ.')
    return api<{ sourceLanguage: string; sourceLanguageStatus: 'CONFIRMED'; transcriptRevision: number; idempotent: boolean }>(
      `/projects/${encodeURIComponent(projectId)}/source-language/confirm`,
      { method: 'POST', signal, body: JSON.stringify({ sourceLanguage, expectedRevision }) },
    )
  },
}
