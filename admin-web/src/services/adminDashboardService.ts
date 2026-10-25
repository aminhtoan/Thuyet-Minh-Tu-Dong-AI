import { adminApi } from '../lib/api';
import type { AdminDashboardData } from '../types/dashboard';
import { assertDashboardMetrics } from '../utils/dashboardMetrics';
type Dto = { stats: AdminDashboardData['stats']; listenAnalytics?: AdminDashboardData['listenAnalytics']; recentProjects: { id:string; name:string; user:{id:string;fullName:string}|null; sourceLanguage:string; targetLanguages:string[]; status:AdminDashboardData['recentProjects'][number]['status']; progress:number; updatedAt:string }[]; processingJobs:{id:string;project:{id:string;name:string}|null;type:AdminDashboardData['processingJobs'][number]['type'];status:AdminDashboardData['processingJobs'][number]['status'];progress:number;startedAt:string|null;updatedAt:string}[]; recentActivities:{id:string;actor:{id:string}|null;action:string;entityType:string;entityId:string;description:string;createdAt:string}[]; jobSummary:AdminDashboardData['jobSummary'];generatedAt:string };
export const adminDashboardService = {
  async getDashboard({ signal }: { signal?: AbortSignal } = {}): Promise<AdminDashboardData> {
    const d = await adminApi<Dto>('/admin/dashboard', { signal });
    assertDashboardMetrics(d);
    if (!Array.isArray(d.recentProjects) || !Array.isArray(d.processingJobs) || !Array.isArray(d.recentActivities)) throw new Error('Thiếu danh sách thống kê quản trị.');
    if (d.recentProjects.some(x => !x || typeof x.id !== 'string' || typeof x.name !== 'string' || typeof x.status !== 'string' || !Array.isArray(x.targetLanguages) || x.targetLanguages.some(code => typeof code !== 'string')) ||
      d.processingJobs.some(x => !x || typeof x.id !== 'string' || typeof x.type !== 'string' || typeof x.status !== 'string') ||
      d.recentActivities.some(x => !x || typeof x.id !== 'string' || typeof x.description !== 'string')) throw new Error('Danh sách thống kê quản trị không hợp lệ.');
    return { ...d, source: 'ADMIN_API',
      listenAnalytics: d.listenAnalytics ? {
        topLanguages: Array.isArray(d.listenAnalytics.topLanguages) ? d.listenAnalytics.topLanguages : [],
        topAudios: Array.isArray(d.listenAnalytics.topAudios) ? d.listenAnalytics.topAudios : [],
      } : undefined,
      recentProjects: d.recentProjects.map(x => ({ id: x.id, name: x.name, userId: x.user?.id ?? '', customerName: x.user?.fullName ?? 'Tài khoản không còn tồn tại', sourceLanguage: x.sourceLanguage, targetLanguages: x.targetLanguages, status: x.status, progress: x.progress, updatedAt: x.updatedAt })),
      processingJobs: d.processingJobs.map(x => ({ id: x.id, projectId: x.project?.id ?? '', projectName: x.project?.name ?? 'Dự án không còn tồn tại', type: x.type, status: x.status, progress: x.progress, startedAt: x.startedAt ?? undefined, updatedAt: x.updatedAt })),
      recentActivities: d.recentActivities.map(x => ({ id: x.id, userId: x.actor?.id ?? '', action: x.action, entityType: x.entityType, entityId: x.entityId, description: x.description, createdAt: x.createdAt })),
    };
  },
};
