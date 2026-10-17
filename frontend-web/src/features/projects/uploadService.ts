import { api } from '../../lib/api'
import type { LanguageCode } from './types'

export type UploadOptions = { projectName: string; description: string; sourceLanguage: LanguageCode; file: File; signal: AbortSignal; onProgress: (progress: number) => void }
export type ExistingProjectUploadOptions = { projectId: string; file: File; signal: AbortSignal; onProgress: (progress: number) => void }
type CreatedProject = { project: { id: string } }

export async function uploadMediaToProject({ projectId, file, signal, onProgress }: ExistingProjectUploadOptions): Promise<void> {
  onProgress(0)
  const form = new FormData()
  form.append('file', file)
  await api(`/projects/${encodeURIComponent(projectId)}/media`, { method: 'POST', signal, body: form })
  onProgress(100)
}

export async function uploadProjectMedia({ projectName, description, sourceLanguage, file, signal, onProgress }: UploadOptions): Promise<void> {
  onProgress(0)
  const { project } = await api<CreatedProject>('/projects', { method: 'POST', signal, body: JSON.stringify({ name: projectName, description, sourceLanguage }) })
  try {
    await uploadMediaToProject({ projectId: project.id, file, signal, onProgress })
  } catch (error) {
    try { await api(`/projects/${project.id}`, { method: 'DELETE' }) } catch { /* best-effort cleanup */ }
    throw error
  }
  void import('./projectRepository').then(({ projectRepository }) => projectRepository.refresh()).catch(() => {})
}
