import { ApiError, api } from '../../lib/api';
import { mergeUpdatedProject } from './projectEditing.mjs';
import type { LanguageCode, MediaType, Project, ProjectPagination, ProjectStatus, ProjectWorkflow } from './types';
type ProjectDto = { id: string; name: string; description?: string; sourceLanguage: LanguageCode; status: ProjectStatus; progress: number; workflow?: ProjectWorkflow; createdAt: string; updatedAt: string };
type MediaDto = { originalName: string; mediaType: MediaType; fileSize: number; duration: number | null };
type TranslationDto = { targetLanguage: LanguageCode; updatedAt: string };
type State = { projects: readonly Project[]; loading: boolean; error: string | null };
let state: State = { projects: [], loading: true, error: null };
let activeLoad: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const setState = (patch: Partial<State>) => { state = { ...state, ...patch }; emit(); };
async function enrich(project: ProjectDto, signal?: AbortSignal): Promise<Project> {
  const [mediaResult, translationsResult] = await Promise.allSettled([api<{ media: MediaDto }>(`/projects/${project.id}/media`, { signal }), api<{ translations: TranslationDto[] }>(`/projects/${project.id}/translations`, { signal })]);
  const media = mediaResult.status === 'fulfilled' ? mediaResult.value.media : null;
  const payload = translationsResult.status === 'fulfilled' ? translationsResult.value.translations : undefined;
  const translations = Array.isArray(payload) ? payload : [];
  const latest = [...translations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return { ...project, progress: project.progress || undefined, targetLanguage: latest?.targetLanguage, mediaType: media?.mediaType, mediaName: media?.originalName, mediaSize: media?.fileSize, durationSeconds: media?.duration ?? undefined,
    metadataState: { media: mediaResult.status === 'fulfilled' ? (media ? 'READY' : 'UNKNOWN') : mediaResult.reason instanceof ApiError && mediaResult.reason.code === 'MEDIA_NOT_FOUND' ? 'EMPTY' : 'ERROR', translation: translationsResult.status === 'rejected' ? 'ERROR' : !Array.isArray(payload) ? 'UNKNOWN' : payload.length ? 'READY' : 'EMPTY' } };
}
async function load() { setState({ loading: true, error: null }); try { const response = await api<{ projects: ProjectDto[] }>('/projects?page=1&limit=20'); setState({ projects: await Promise.all(response.projects.map(project => enrich(project))), loading: false }); } catch (error) { setState({ loading: false, error: error instanceof ApiError ? error.message : 'Không thể kết nối đến máy chủ.' }); } }
export const projectRepository = {
  getState: () => state, getAll: () => state.projects, getById: (id: string) => state.projects.find((project) => project.id === id), subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, refresh: () => { activeLoad ??= load().finally(() => { activeLoad = null; }); return activeLoad; },
  async listPage(input: { page: number; limit: number; search?: string; status?: ProjectStatus }, signal?: AbortSignal) { const query = new URLSearchParams({ page: String(input.page), limit: String(input.limit) }); if (input.search?.trim()) query.set('search', input.search.trim()); if (input.status) query.set('status', input.status); const response = await api<{ projects: ProjectDto[]; pagination: ProjectPagination }>(`/projects?${query}`, { signal }); return { projects: await Promise.all(response.projects.map(project => enrich(project, signal))), pagination: response.pagination }; },
  async getProject(id: string) { const response = await api<{ project: ProjectDto }>(`/projects/${id}`); const project = await enrich(response.project); setState({ projects: state.projects.some((item) => item.id === id) ? state.projects.map((item) => item.id === id ? project : item) : [project, ...state.projects] }); return project; },
  async updateProject(id: string, patch: { name?: string; description?: string; sourceLanguage?: string }) { const response = await api<{ project: ProjectDto }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }); const project = await enrich(response.project); setState({ projects: mergeUpdatedProject(state.projects, project) }); return project; }, async deleteProject(id: string) { await api(`/projects/${id}`, { method: 'DELETE' }); setState({ projects: state.projects.filter((item) => item.id !== id) }); }, update: (id: string, patch: Partial<Project>) => setState({ projects: state.projects.map((project) => project.id === id ? { ...project, ...patch } : project) }),
};
