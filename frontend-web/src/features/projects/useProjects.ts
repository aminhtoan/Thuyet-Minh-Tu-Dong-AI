import { useSyncExternalStore } from 'react';
import { projectRepository } from './projectRepository';
export function useProjects() {
  const projects = useSyncExternalStore(projectRepository.subscribe, projectRepository.getAll, projectRepository.getAll);
  return { projects, isLoading: false, error: null as string | null };
}
