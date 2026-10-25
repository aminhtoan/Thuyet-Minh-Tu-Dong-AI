import type { LanguageCode, ProjectWorkflow, WorkflowStep, WorkflowTargetLanguageSource } from './types';

export type WorkflowDestination = Exclude<WorkflowStep, 'UPLOAD' | 'UNKNOWN'>;
export type WorkflowRouteAccess = { allowed: boolean; canMutate: boolean; targetLanguage: LanguageCode | null; reason: string | null };

const stepOrder: WorkflowDestination[] = ['TRANSCRIPT', 'TRANSLATION', 'VOICE', 'GENERATE', 'RESULT'];
const trustedLanguageSources = new Set<WorkflowTargetLanguageSource>(['JOB', 'TRANSLATION', 'NARRATION', 'RESULT']);

export function normalizeCatalogLanguageCode(value: unknown): LanguageCode | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(code) ? code : null;
}

function trustedTarget(workflow: ProjectWorkflow): LanguageCode | null {
  const target = workflow.targetLanguage;
  if (!target || !trustedLanguageSources.has(target.source)) return null;
  return normalizeCatalogLanguageCode(target.code);
}

function hasResultArtifact(workflow: ProjectWorkflow): boolean {
  if (workflow.mediaType === 'AUDIO') return workflow.artifact.narrationReady;
  if (workflow.mediaType === 'VIDEO') return workflow.artifact.resultReady;
  return false;
}

export function resolveWorkflowRouteAccess(workflow: ProjectWorkflow | undefined, destination: WorkflowDestination, requestedLanguage: string | null = null): WorkflowRouteAccess {
  const requested = requestedLanguage === null ? null : normalizeCatalogLanguageCode(requestedLanguage);
  if (requestedLanguage !== null && !requested) return { allowed: false, canMutate: false, targetLanguage: null, reason: 'Ngôn ngữ trên liên kết không hợp lệ.' };
  if (!workflow || workflow.step === 'UNKNOWN') return { allowed: false, canMutate: false, targetLanguage: null, reason: 'Chưa có thông tin quy trình đáng tin cậy.' };
  if (workflow.state === 'BLOCKED') return { allowed: false, canMutate: false, targetLanguage: null, reason: 'Quy trình đang bị chặn và chưa thể khôi phục an toàn.' };

  const currentIndex = stepOrder.indexOf(workflow.step as WorkflowDestination);
  const destinationIndex = stepOrder.indexOf(destination);
  if (currentIndex < 0 || destinationIndex < 0 || destinationIndex > currentIndex) {
    return { allowed: false, canMutate: false, targetLanguage: null, reason: 'Bước này chưa sẵn sàng theo quy trình của dự án.' };
  }

  const targetLanguage = trustedTarget(workflow);
  const targetRequired = (['VOICE', 'GENERATE', 'RESULT'] as WorkflowDestination[]).includes(destination)
    || (destination === 'TRANSLATION' && ['PROCESSING', 'FAILED'].includes(workflow.state));
  if (targetRequired && !targetLanguage) return { allowed: false, canMutate: false, targetLanguage: null, reason: 'Chưa xác định được ngôn ngữ đích từ dữ liệu quy trình.' };
  if (requested && targetLanguage && requested !== targetLanguage && destination !== 'TRANSLATION') return { allowed: false, canMutate: false, targetLanguage, reason: 'Ngôn ngữ trên liên kết không khớp dữ liệu quy trình.' };

  if (destination === 'RESULT' && (workflow.state !== 'COMPLETED' || !hasResultArtifact(workflow))) {
    return { allowed: false, canMutate: false, targetLanguage, reason: 'Tệp kết quả chưa được máy chủ xác nhận sẵn sàng.' };
  }

  const isCurrent = destination === workflow.step;
  const canMutate = isCurrent && workflow.canResume && ['READY', 'FAILED'].includes(workflow.state);
  const reason = canMutate ? null
    : workflow.state === 'PROCESSING' && isCurrent ? 'Dự án đang được xử lý. Trang này chỉ hiển thị tiến trình và không tự tạo tác vụ mới.'
      : 'Bạn có thể xem dữ liệu đã có; thao tác tạo hoặc thử lại không khả dụng ở bước này.';
  return { allowed: true, canMutate, targetLanguage, reason };
}
