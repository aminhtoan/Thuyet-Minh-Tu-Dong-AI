import type { Project } from '../projects/types';
import { languageDisplayName } from '../projects/languages';
import type { Result } from './types';
export function resultRows(project: Project, result: Result): [string, string][] {
  const missing = 'Không có dữ liệu';
  return [
    ['Dự án', project.name], ['Ngôn ngữ gốc', project.sourceLanguage ? languageDisplayName(project.sourceLanguage) : 'Chưa xác định'],
    ['Ngôn ngữ đích', languageDisplayName(result.languageCode)], ['Loại media', result.mediaType],
    ['Giọng đọc', result.voiceName ?? missing], ['Tốc độ', result.speed === undefined ? missing : result.speed + 'x'],
    ['Dung lượng kết quả', (result.fileSize / 1048576).toFixed(2) + ' MB'],
    ['Hoàn tất', new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.createdAt))],
    ...(project.durationSeconds === undefined ? [] : [['Thời lượng nguồn', project.durationSeconds + ' giây'] as [string, string]]),
    ...(project.mediaSize === undefined ? [] : [['Dung lượng nguồn', (project.mediaSize / 1048576).toFixed(1) + ' MB'] as [string, string]]),
  ];
}

