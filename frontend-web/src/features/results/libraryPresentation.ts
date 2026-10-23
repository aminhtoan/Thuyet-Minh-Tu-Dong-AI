import type { Project } from '../projects/types'
import { resolveWorkflowRouteAccess } from '../projects/workflowRouteGuard.ts'

// Display-only: status alone cannot attest a playable product.
export function libraryProduct(project: Project) {
  const workflow = project.workflow
  if (project.status !== 'COMPLETED' || !workflow || workflow.processing || workflow.state !== 'COMPLETED') return null
  const access = resolveWorkflowRouteAccess(workflow, 'RESULT')
  if (!access.allowed || !access.targetLanguage) return null
  if (workflow.mediaType === 'VIDEO' && workflow.targetLanguage?.source !== 'RESULT') return null
  if (workflow.mediaType === 'AUDIO' && workflow.targetLanguage?.source !== 'NARRATION') return null
  if (workflow.mediaType !== 'VIDEO' && workflow.mediaType !== 'AUDIO') return null
  return { project, mediaType: workflow.mediaType, language: access.targetLanguage,
    path: `/projects/${encodeURIComponent(project.id)}/result?language=${encodeURIComponent(access.targetLanguage)}` }
}
export type LibraryProduct = NonNullable<ReturnType<typeof libraryProduct>>
export function filterLibrary(products: readonly LibraryProduct[], filters: { query: string; media: string; language: string }) {
  const query = filters.query.trim().toLocaleLowerCase('vi')
  return products.filter(item => item.project.name.toLocaleLowerCase('vi').includes(query)
    && (filters.media === 'ALL' || item.mediaType === filters.media)
    && (filters.language === 'ALL' || item.language === filters.language))
}
