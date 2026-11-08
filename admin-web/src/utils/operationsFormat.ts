import type { LanguageCode, MediaType } from '../types/operations';
import type { ProcessingJobType, ProjectStatus } from '../types/domain';
export function formatLanguageCode(code: string | null | undefined): string {
  return typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : 'Chưa xác định';
}
export function formatLanguagePair(source: string | null | undefined, targets: readonly string[]): string {
  return `${formatLanguageCode(source)} → ${targets.map(formatLanguageCode).join(', ') || '—'}`;
}
export const languageLabels:Record<LanguageCode,string>={vi:'Tiếng Việt',en:'Tiếng Anh',ja:'Tiếng Nhật',ko:'Tiếng Hàn'};
export const mediaLabels:Record<MediaType,string>={VIDEO:'Video',AUDIO:'Âm thanh'};
export const jobTypeLabels:Record<ProcessingJobType,string>={TRANSCRIPTION:'Tạo bản ghi',TRANSLATION:'Dịch thuật',TTS:'Tạo giọng đọc',VIDEO_PROCESSING:'Xử lý video'};
export const projectStatusLabels:Record<ProjectStatus,string>={DRAFT:'Bản nháp',UPLOADED:'Đã tải lên',TRANSCRIBING:'Đang tạo bản ghi',TRANSCRIBED:'Đã tạo bản ghi',TRANSLATING:'Đang dịch',TRANSLATED:'Đã dịch',GENERATING_AUDIO:'Đang tạo giọng đọc',PROCESSING_VIDEO:'Đang xử lý video',COMPLETED:'Hoàn thành',FAILED:'Thất bại'};
export const pipelineStages=[{label:'Tải lên',statuses:['UPLOADED']},{label:'Bản ghi',statuses:['TRANSCRIBING','TRANSCRIBED']},{label:'Dịch thuật',statuses:['TRANSLATING','TRANSLATED']},{label:'Giọng đọc',statuses:['GENERATING_AUDIO']},{label:'Xử lý video',statuses:['PROCESSING_VIDEO']},{label:'Hoàn thành',statuses:['COMPLETED']}] as const;
export function formatDuration(start?:string,end?:string){if(!start||!end)return '—';const minutes=Math.max(1,Math.round((Date.parse(end)-Date.parse(start))/60000));return `${minutes} phút`;}
