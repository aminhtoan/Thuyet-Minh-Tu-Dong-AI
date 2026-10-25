import { resolveWorkflowRouteAccess } from '../projects/workflowRouteGuard';
import type { GenerationContext } from './types';

// AUDIO's result is the CURRENT narration; no audio-processing POST exists.
// Completion requires Backend artifact/workflow evidence, never TTS progress alone.
export function generationReadiness(context: GenerationContext) {
  const { project, config } = context;
  if (!config.narrationId) return { resultReady: false, canStart: false, reason: 'Chưa có tệp giọng đọc hợp lệ. Hãy kiểm tra lại bước Giọng đọc.' };
  if (!project.mediaType || project.workflow?.mediaType !== project.mediaType) return { resultReady: false, canStart: false, reason: 'Chưa xác minh được loại phương tiện từ quy trình máy chủ.' };
  if (!project.workflow.artifact.narrationReady) return { resultReady: false, canStart: false, reason: 'Máy chủ chưa xác nhận tệp giọng đọc CURRENT. Hãy kiểm tra lại bước Giọng đọc.' };
  if (project.workflow.processing) return { resultReady: false, canStart: false, reason: 'Máy chủ đang xử lý yêu cầu. Chỉ kiểm tra trạng thái, không tạo yêu cầu mới.' };
  const result = resolveWorkflowRouteAccess(project.workflow, 'RESULT', config.languageCode);
  if (result.allowed) return { resultReady: true, canStart: false, reason: null };
  const generate = resolveWorkflowRouteAccess(project.workflow, 'GENERATE', config.languageCode);
  if (project.mediaType === 'AUDIO') return { resultReady: false, canStart: false, reason: 'Máy chủ chưa xác nhận tệp âm thanh sẵn sàng. Hãy kiểm tra trạng thái hoặc quay lại Giọng đọc; không cần chạy bước ghép video.' };
  return { resultReady: false, canStart: generate.allowed && generate.canMutate, reason: generate.reason };
}
