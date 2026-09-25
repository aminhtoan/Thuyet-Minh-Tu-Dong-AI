import { mockProjects } from './mockProjects';
import type { Project } from './types';

export type ProjectRepository = { getAll: () => readonly Project[]; getById: (id: string) => Project | undefined };
export const projectRepository: ProjectRepository = { getAll: () => mockProjects, getById: (id) => mockProjects.find((project) => project.id === id) };
