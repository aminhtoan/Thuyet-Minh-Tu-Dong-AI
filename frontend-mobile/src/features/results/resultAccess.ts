import type { ProjectWorkflow } from '../projects/types';

// RESULT subset of Web workflowRouteGuard; not a translation/TTS catalog.
export function normalizeResultLanguage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(code) ? code : null;
}
export function resultAccess(workflow: ProjectWorkflow | undefined, requested: string | null = null) {
  const language = requested === null ? null : normalizeResultLanguage(requested);
  const denied = (reason: string) => ({ allowed: false, targetLanguage: null, reason });
  if (requested !== null && !language) return denied('Ngôn ngữ trên liên kết không hợp lệ.');
  if (!workflow || workflow.step === 'UNKNOWN') return denied('Chưa có thông tin quy trình đáng tin cậy.');
  if (workflow.state === 'BLOCKED') return denied('Quy trình đang bị chặn và chưa thể khôi phục an toàn.');
  if (workflow.step !== 'RESULT') return denied('Bước này chưa sẵn sàng theo quy trình của dự án.');
  const target = workflow.targetLanguage;
  const confirmed = target && ['JOB', 'TRANSLATION', 'NARRATION', 'RESULT'].includes(target.source) ? normalizeResultLanguage(target.code) : null;
  if (!confirmed) return denied('Chưa xác định được ngôn ngữ đích từ dữ liệu quy trình.');
  if (language && confirmed !== language) return denied('Ngôn ngữ trên liên kết không khớp dữ liệu quy trình.');
  const ready = workflow.mediaType === 'VIDEO' ? workflow.artifact?.resultReady : workflow.mediaType === 'AUDIO' && workflow.artifact?.narrationReady;
  if (workflow.state !== 'COMPLETED' || !ready) return denied('Tệp kết quả chưa được máy chủ xác nhận sẵn sàng.');
  return { allowed: true, targetLanguage: confirmed, reason: null };
}
export function resultLanguageName(value: string): string {
  const names: Record<string, string> = { vi: 'Tiếng Việt', en: 'English', ja: '日本語', ko: '한국어' };
  try { const name = new Intl.DisplayNames(['vi'], { type: 'language', fallback: 'none' }).of(value); if (name) return name.charAt(0).toUpperCase() + name.slice(1); } catch { /* Same safe fallback as Web. */ }
  return names[value] || value.toUpperCase();
}
