import type { DataState, Project, ProjectMetadataState } from './types'

export function collectionDataState(loading: boolean, error: string | null, itemCount: number): DataState {
  if (loading) return 'LOADING'
  if (error) return 'ERROR'
  return itemCount > 0 ? 'READY' : 'EMPTY'
}

export function mediaDataState(result: PromiseSettledResult<unknown>): DataState {
  if (result.status === 'fulfilled') return result.value ? 'READY' : 'UNKNOWN'
  if (typeof result.reason === 'object' && result.reason !== null && 'code' in result.reason && result.reason.code === 'MEDIA_NOT_FOUND') return 'EMPTY'
  return 'ERROR'
}

export function translationDataState(result: PromiseSettledResult<unknown>): DataState {
  if (result.status === 'rejected') return 'ERROR'
  if (!Array.isArray(result.value)) return 'UNKNOWN'
  return result.value.length > 0 ? 'READY' : 'EMPTY'
}

export function projectMetadataState(project: Project): ProjectMetadataState {
  return project.metadataState ?? { media: 'UNKNOWN', translation: 'UNKNOWN' }
}

export function hasIncompleteProjectMetadata(projects: readonly Project[]): boolean {
  return projects.some((project) => {
    const metadata = projectMetadataState(project)
    return metadata.media === 'ERROR' || metadata.media === 'UNKNOWN'
      || metadata.translation === 'ERROR' || metadata.translation === 'UNKNOWN'
  })
}
