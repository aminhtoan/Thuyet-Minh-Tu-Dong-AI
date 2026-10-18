import { useEffect, useState } from 'react'
import { projectRepository } from '../projects/projectRepository'
import { collectionDataState } from '../projects/projectDataState'
import type { Project } from '../projects/types'
export function useCompleteHistory() {
  const [projects, setProjects] = useState<Project[]>([]), [isLoading, setLoading] = useState(true), [error, setError] = useState<string | null>(null), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError(null)
      try {
        const items: Project[] = []
        for (let page = 1; ; page++) {
          const result = await projectRepository.listPage({ page, limit: 100 }, controller.signal)
          if (controller.signal.aborted) return
          items.push(...result.projects)
          if (page >= result.pagination.totalPages) break
        }
        setProjects([...new Map(items.map(item => [item.id, item])).values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được lịch sử.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [attempt])
  return { projects, isLoading, error, dataState: collectionDataState(isLoading, error, projects.length), reload: () => setAttempt(value => value + 1) }
}
