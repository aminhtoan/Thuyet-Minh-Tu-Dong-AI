export const TRANSCRIPT_SEGMENT_MAX_LENGTH = 4000;

export function validateTranscriptSegmentText(value, originalValue = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return { valid: false, changed: false, text, error: 'Nội dung phân đoạn không được để trống.' };
  if (text.length > TRANSCRIPT_SEGMENT_MAX_LENGTH) return { valid: false, changed: text !== originalValue.trim(), text, error: `Nội dung không được vượt quá ${TRANSCRIPT_SEGMENT_MAX_LENGTH} ký tự.` };
  const changed = text !== originalValue.trim();
  return { valid: true, changed, text, error: changed ? null : 'Nội dung chưa thay đổi.' };
}

export function transcriptEditAccess(featureEnabled, workflow, revision, hasBackendSegmentId) {
  if (!featureEnabled) return { allowed: false, reason: 'Chỉnh sửa bản ghi đang tạm khóa cho đến khi kiểm thử transaction hoàn tất.' };
  if (!Number.isInteger(revision) || revision < 1) return { allowed: false, reason: 'Bản ghi cũ chưa có revision an toàn để chỉnh sửa.' };
  if (!hasBackendSegmentId) return { allowed: false, reason: 'Phân đoạn chưa có định danh máy chủ đáng tin cậy.' };
  if (!workflow || workflow.step === 'UNKNOWN' || workflow.state === 'BLOCKED') return { allowed: false, reason: 'Chưa có thông tin quy trình đáng tin cậy để chỉnh sửa.' };
  if (workflow.processing?.type === 'TRANSCRIPTION' || (workflow.step === 'TRANSCRIPT' && workflow.state === 'PROCESSING')) {
    return { allowed: false, reason: 'Không thể chỉnh sửa khi nhận diện giọng nói đang xử lý.' };
  }
  if (!['TRANSLATION', 'VOICE', 'GENERATE', 'RESULT'].includes(workflow.step)) {
    return { allowed: false, reason: 'Bản ghi chưa ở bước có thể chỉnh sửa an toàn.' };
  }
  if (!['READY', 'COMPLETED'].includes(workflow.state)) return { allowed: false, reason: 'Trạng thái quy trình hiện tại chưa cho phép chỉnh sửa an toàn.' };
  return { allowed: true, reason: null };
}

export function hasConfirmedDownstreamArtifact(workflow) {
  if (!workflow) return false;
  return ['VOICE', 'GENERATE', 'RESULT'].includes(workflow.step)
    || workflow.artifact?.narrationReady === true
    || workflow.artifact?.resultReady === true;
}
