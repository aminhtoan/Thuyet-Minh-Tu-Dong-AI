import { api } from '../../lib/api'
import type { LanguageCode } from './types'

export type UploadOptions = { projectName: string; sourceLanguage: LanguageCode; file: File; signal: AbortSignal; onProgress: (progress: number) => void; failAt?: number }

type CreatedProject = { project: { id: string } }

export async function uploadProjectMedia({ projectName, sourceLanguage, file, signal, onProgress }: UploadOptions): Promise<void> {
  onProgress(0)
  const { project } = await api<CreatedProject>('/projects', { method: 'POST', signal, body: JSON.stringify({ name: projectName, sourceLanguage }) })
  try {
    const form = new FormData()
    form.append('media', file)
    await api(`/projects/${project.id}/media`, { method: 'POST', signal, body: form })
    onProgress(100)
  } catch (error) {
    try { await api(`/projects/${project.id}`, { method: 'DELETE' }) } catch { /* best-effort cleanup */ }
    throw error
  }
}
