export class TranscriptCancelledError extends Error {
  constructor() { super('Đã hủy thao tác.'); this.name = 'TranscriptCancelledError'; }
}

export function mapTranscriptDto(value) {
  const segments = Array.isArray(value.segments) ? value.segments : [];
  return {
    id: value.id,
    projectId: value.projectId,
    languageCode: value.language,
    fullText: value.fullText,
    status: 'SAVED',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    segments: segments.map((segment, position) => ({
      id: segment.id || `${value.id}:${segment.index ?? position}`,
      sequence: Number.isInteger(segment.index) ? segment.index : position,
      startTime: Number.isFinite(segment.startTime) ? segment.startTime : undefined,
      endTime: Number.isFinite(segment.endTime) ? segment.endTime : undefined,
      text: typeof segment.text === 'string' ? segment.text : '',
    })),
  };
}

export async function confirmTranscriptRequest(confirm, request) {
  if (!await confirm()) throw new TranscriptCancelledError();
  return request();
}

export async function runTranscriptRequestOnce(lock, request) {
  if (lock.current) return { started: false };
  lock.current = true;
  try { return { started: true, value: await request() }; }
  finally { lock.current = false; }
}

export function transcriptErrorMessage(error) {
  if (error instanceof TranscriptCancelledError) return null;
  if (error?.name === 'TranscriptTimeoutError') return 'Yêu cầu tạo bản ghi đã hết thời gian chờ. Vui lòng thử lại.';
  if (error?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (error?.code === 'TRANSCRIPTION_ALREADY_RUNNING') return 'Dự án đang được chuyển giọng nói thành văn bản.';
  if (error?.code === 'MEDIA_FILE_MISSING') return 'Tệp phương tiện nguồn không còn tồn tại trên máy chủ.';
  if (error instanceof TypeError) return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.';
  return typeof error?.message === 'string' && error.message.trim() ? error.message : 'Không thể tạo bản ghi.';
}

export function deriveTranscriptStage(projectStatus, editorStatus, hasTranscript) {
  if (editorStatus === 'GENERATING' || projectStatus === 'TRANSCRIBING') return 'TRANSCRIBING';
  if (hasTranscript) return 'TRANSCRIBED';
  return projectStatus;
}
