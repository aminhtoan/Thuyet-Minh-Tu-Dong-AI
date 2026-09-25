import { mockProjects } from './mockProjects';
import type { Project } from './types';
let projects: readonly Project[] = mockProjects;
const listeners = new Set<() => void>();
export const projectRepository = {
  getAll: () => projects,
  getById: (id: string) => projects.find(project => project.id === id),
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  update: (id: string, patch: Partial<Project>) => {
    projects = projects.map(project => project.id === id ? { ...project, ...patch } : project);
    listeners.forEach(listener => listener());
  },
};
