import type { Project } from '../projects/types';
import { languageNames } from '../projects/projectUtils';
import type { Result } from './types';
export function resultRows(project: Project, result: Result): [string, string][] {
  const missing = 'Chưa lưu trong dữ liệu mẫu';
  return [
    ['Dự án', project.name], ['Ngôn ngữ gốc', languageNames[project.sourceLanguage]],
    ['Ngôn ngữ đích', languageNames[result.languageCode]], ['Loại media', result.mediaType],
    ['Transcript', result.transcriptCount === undefined ? missing : result.transcriptCount + ' segments'],
    ['Translation', result.translationCount === undefined ? missing : result.translationCount + ' segments'],
    ['Giọng đọc', result.voiceName ?? missing], ['Tốc độ', result.speed === undefined ? missing : result.speed + 'x'],
    ['Hoàn tất mô phỏng', new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.createdAt))],
    ...(project.durationSeconds === undefined ? [] : [['Thời lượng nguồn', project.durationSeconds + ' giây'] as [string, string]]),
    ...(project.mediaSize === undefined ? [] : [['Dung lượng nguồn', (project.mediaSize / 1048576).toFixed(1) + ' MB'] as [string, string]]),
  ];
}

