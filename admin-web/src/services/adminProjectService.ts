import { adminApi } from '../lib/api';
import type { AdminJob, AdminNarration, AdminProject, NarrationApprovalInfo, ProjectListResult, ProjectQuery } from '../types/operations';

type P = {
  id: string;
  user: { id: string; fullName: string; email: string } | null;
  name: string;
  description: string;
  sourceLanguage: string;
  targetLanguages: string[];
  status: AdminProject['status'];
  progress: number;
  media: { originalName: string; mediaType: 'VIDEO' | 'AUDIO'; mimeType: string; fileSize: number; duration: number | null } | null;
  narrationApproval?: NarrationApprovalInfo;
  createdAt: string;
  updatedAt: string;
};

const duration = (n: number | null) => (n === null ? 'Không xác định' : `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`);

export const mapProject = (p: P): AdminProject => ({
  id: p.id,
  userId: p.user?.id ?? '',
  customerName: p.user?.fullName ?? 'Tài khoản không còn tồn tại',
  customerEmail: p.user?.email ?? '—',
  name: p.name,
  description: p.description,
  sourceLanguage: p.sourceLanguage,
  targetLanguages: p.targetLanguages,
  mediaType: p.media?.mediaType,
  status: p.status,
  progress: p.progress,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  media: p.media
    ? {
        fileName: p.media.originalName,
        mediaType: p.media.mediaType,
        mimeType: p.media.mimeType,
        sizeMb: Number((p.media.fileSize / 1048576).toFixed(2)),
        duration: duration(p.media.duration),
      }
    : null,
  narrationApproval: p.narrationApproval,
});

export const mapJob = (j: {
  id: string;
  project: { id: string; name: string } | null;
  customer: { id: string; fullName: string } | null;
  type: AdminJob['type'];
  targetLanguage: string | null;
  status: AdminJob['status'];
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}): AdminJob => ({
  id: j.id,
  projectId: j.project?.id ?? '',
  projectName: j.project?.name ?? 'Dự án không còn tồn tại',
  userId: j.customer?.id ?? '',
  customerName: j.customer?.fullName ?? 'Tài khoản không còn tồn tại',
  type: j.type,
  targetLanguage: j.targetLanguage ?? undefined,
  status: j.status,
  progress: j.progress,
  errorMessage: j.errorMessage ?? undefined,
  createdAt: j.createdAt,
  updatedAt: j.updatedAt,
  startedAt: j.startedAt ?? undefined,
  completedAt: j.completedAt ?? undefined,
});

export const adminProjectService = {
  async getProjects(q: ProjectQuery = {}): Promise<ProjectListResult> {
    const s = new URLSearchParams({ page: String(q.page ?? 1), limit: String(q.limit ?? 10) });
    if (q.search?.trim()) s.set('search', q.search.trim());
    if (q.status && q.status !== 'ALL') s.set('status', q.status);
    if (q.language && q.language !== 'ALL') s.set('language', q.language);
    if (q.mediaType && q.mediaType !== 'ALL') s.set('mediaType', q.mediaType);
    const d = await adminApi<{ items: P[]; summary: ProjectListResult['summary']; pagination: ProjectListResult['pagination'] }>(
      `/admin/projects?${s}`,
      { signal: q.signal }
    );
    return { ...d, items: d.items.map(mapProject) };
  },

  async getProjectById(id: string, o: { signal?: AbortSignal } = {}) {
    const d = await adminApi<{ project: P; jobs: Parameters<typeof mapJob>[0][] }>(`/admin/projects/${id}`, { signal: o.signal });
    return mapProject(d.project);
  },

  async getProjectJobs(id: string, o: { signal?: AbortSignal } = {}) {
    const d = await adminApi<{ project: P; jobs: Parameters<typeof mapJob>[0][] }>(`/admin/projects/${id}`, { signal: o.signal });
    return d.jobs.map(mapJob);
  },

  async getProjectNarrations(projectId: string, o: { signal?: AbortSignal } = {}): Promise<AdminNarration[]> {
    const d = await adminApi<{ narrations: AdminNarration[] }>(`/admin/projects/${projectId}/narrations`, { signal: o.signal });
    return d.narrations;
  },

  async updateNarrationApproval(narrationId: string, isApproved: boolean): Promise<AdminNarration> {
    const d = await adminApi<{ narration: AdminNarration }>(`/admin/narrations/${narrationId}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ isApproved }),
    });
    return d.narration;
  },

  async createProject(body: { name: string; sourceLanguage: string; description?: string }) {
    const d = await adminApi<{ project: P }>('/projects', { method: 'POST', body: JSON.stringify(body) });
    return mapProject(d.project);
  },
};
