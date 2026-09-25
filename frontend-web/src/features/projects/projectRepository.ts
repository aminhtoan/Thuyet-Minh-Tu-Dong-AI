import { mockProjects } from './mockProjects'
import type { Project } from './types'

export type ProjectRepository = { getAll: () => readonly Project[] }

export const projectRepository: ProjectRepository = {
  getAll: () => mockProjects,
}
