import type { Project } from '../projects/types';
import { resultLanguageName } from './resultAccess';
import type { Result } from './types';
export function resultRows(project: Project, result: Result): [string, string][] {
  const missing = 'Không có dữ liệu';
  return [
    ['Dự án', project.name], ['Ngôn ngữ gốc', resultLanguageName(project.sourceLanguage)],
    ['Ngôn ngữ đích', resultLanguageName(result.languageCode)], ['Loại media', result.mediaType],
    ['Giọng đọc', result.voiceName ?? missing], ['Tốc độ', result.speed === undefined ? missing : result.speed + 'x'],
    ['Dung lượng kết quả', (result.fileSize / 1048576).toFixed(2) + ' MB'],
    ['Hoàn tất', new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.createdAt))],
    ...(project.durationSeconds === undefined ? [] : [['Thời lượng nguồn', project.durationSeconds + ' giây'] as [string, string]]),
    ...(project.mediaSize === undefined ? [] : [['Dung lượng nguồn', (project.mediaSize / 1048576).toFixed(1) + ' MB'] as [string, string]]),
  ];
}

