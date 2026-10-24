import type { Project } from './types';
import { isLanguageCode } from './languages';

export const DASHBOARD_RESUME_TIMEOUT_MS = 8_000;
const steps = ['TRANSCRIPT', 'TRANSLATION', 'VOICE', 'GENERATE', 'RESULT'] as const;
const sources = new Set(['JOB', 'TRANSLATION', 'NARRATION', 'RESULT']);
export class DashboardResumeError extends Error {}

// Dashboard-only port of Web projectAction + workflowRouteGuard; no status/progress guessing.
export function dashboardWorkflowPath(project: Project): string | null {
  const workflow = project.workflow;
  if (!workflow || workflow.canResume !== true || !['READY', 'PROCESSING', 'FAILED', 'COMPLETED'].includes(workflow.state) || workflow.step === 'UNKNOWN') return null;
  if (workflow.step === 'UPLOAD') return workflow.state === 'READY' ? `/projects/${project.id}` : null;
  if (!steps.includes(workflow.step)) return null;
  const target = workflow.targetLanguage;
  const code = target && sources.has(target.source) && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(target.code.trim().toLowerCase()) ? target.code.trim().toLowerCase() : null;
  const needsTarget = ['VOICE', 'GENERATE', 'RESULT'].includes(workflow.step) || (workflow.step === 'TRANSLATION' && ['PROCESSING', 'FAILED'].includes(workflow.state));
  if (needsTarget && !code) return null;
  if (code && !isLanguageCode(code)) return null; // Existing Mobile screens cannot honor other language parameters.
  if (workflow.step === 'RESULT' && (workflow.state !== 'COMPLETED' || !(workflow.mediaType === 'AUDIO' ? workflow.artifact?.narrationReady : workflow.mediaType === 'VIDEO' && workflow.artifact?.resultReady))) return null;
  return `/projects/${project.id}/${workflow.step.toLowerCase()}${code ? `?language=${encodeURIComponent(code)}` : ''}`;
}

export type ResumeRead = {
  project: (id: string, signal: AbortSignal) => Promise<Project>;
  attempt: (id: string, signal: AbortSignal) => Promise<{ attempt: { status: string } | null }>;
};
export async function resolveDashboardResume(id: string, read: ResumeRead, signal: AbortSignal, timeout = DASHBOARD_RESUME_TIMEOUT_MS) {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new DashboardResumeError('Không thể xác định dự án cần mở.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  signal.addEventListener('abort', abort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const project = await read.project(id, controller.signal);
        if (controller.signal.aborted) throw new DashboardResumeError('Đã hủy kiểm tra dự án.');
        if (project?.id !== id) throw new DashboardResumeError('Không thể xác minh dữ liệu dự án từ máy chủ.');
        const path = dashboardWorkflowPath(project);
        if (!path) throw new DashboardResumeError('Quy trình hiện chưa thể tiếp tục an toàn hoặc màn hình đích chưa được Mobile hỗ trợ. Hãy mở Chi tiết để kiểm tra.');
        // Project workflow does not include durable Customer attempts. Check the existing GET,
        // never let the legacy Mobile translation UI treat an uncertain English attempt as new.
        if (project.workflow?.step !== 'UPLOAD' && project.workflow?.step !== 'TRANSCRIPT') {
          const response = await read.attempt(id, controller.signal);
          if (!response || !('attempt' in response)) throw new DashboardResumeError('Chưa xác minh được trạng thái yêu cầu dịch.');
          if (response.attempt && (response.attempt.status !== 'DRAFT_SAVED' || project.workflow?.step === 'TRANSLATION')) {
            throw new DashboardResumeError('Yêu cầu dịch chưa sẵn sàng hoặc chưa xác định kết quả. Không gửi lại; hãy mở Chi tiết để kiểm tra.');
          }
        }
        if (controller.signal.aborted) throw new DashboardResumeError('Đã hủy kiểm tra dự án.');
        return path;
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new DashboardResumeError('Máy chủ phản hồi quá lâu. Vui lòng kiểm tra lại trạng thái dự án.')); }, timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
    signal.removeEventListener('abort', abort);
  }
}

export function createResumeLock() {
  let busy = false;
  return async function run<T>(operation: () => Promise<T>): Promise<T | undefined> {
    if (busy) return undefined;
    busy = true;
    try { return await operation(); } finally { busy = false; }
  };
}
