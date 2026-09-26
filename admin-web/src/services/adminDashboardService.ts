import { createAdminDashboardMock } from '../mocks/adminDashboard.mock';
import { adminDashboardScenario } from '../mocks/adminDashboardScenario';
import type { AdminDashboardData } from '../types/dashboard';
type Options = { signal?: AbortSignal; scenario?: 'success' | 'error' | 'empty'; latencyMs?: number };
export const adminDashboardService = {
  getDashboard({ signal, scenario = adminDashboardScenario.mode, latencyMs = adminDashboardScenario.latencyMs }: Options = {}): Promise<AdminDashboardData> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
      const delay = Number.isFinite(latencyMs) ? Math.max(0, latencyMs) : 350;
      const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new DOMException('Aborted', 'AbortError')); };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        if (scenario === 'error') { reject(new Error('Dashboard unavailable')); return; }
        // Replace this local source with GET /api/admin/dashboard in future integration.
        resolve(structuredClone(createAdminDashboardMock(Date.now(), scenario === 'empty')));
      }, delay);
      signal?.addEventListener('abort', abort, { once: true });
    });
  },
};
