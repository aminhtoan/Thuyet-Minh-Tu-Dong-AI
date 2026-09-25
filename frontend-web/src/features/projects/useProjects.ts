import { projectRepository } from './projectRepository'

export function useProjects() {
  return { projects: projectRepository.getAll(), isLoading: false, error: null as string | null }
}
