import { languages } from './languages';
import { projectStatusLabels } from '../../localization/statusLabels.mjs';
import type { LanguageCode, Project, ProjectStatistics, ProjectStatus, ProjectStatusFilter } from './types';

export const languageNames = Object.fromEntries(languages.map(({ code, name }) => [code, name])) as Record<LanguageCode, string>;
export const sourceLanguageOptions = languages.map(({ code, name }) => ({ value: code, label: name }));
const processingStatuses = new Set<ProjectStatus>(['UPLOADED', 'TRANSCRIBING', 'TRANSCRIBED', 'TRANSLATING', 'TRANSLATED', 'GENERATING_AUDIO', 'PROCESSING_VIDEO']);

export function isProcessingStatus(status: ProjectStatus): boolean { return processingStatuses.has(status); }
export function getProjectStatusLabel(status: ProjectStatus): string { return projectStatusLabels[status]; }
export function getProjectStatusVariant(status: ProjectStatus): 'default' | 'info' | 'success' | 'error' { if (status === 'COMPLETED') return 'success'; if (status === 'FAILED') return 'error'; if (isProcessingStatus(status)) return 'info'; return 'default'; }
export function formatLanguageName(code: LanguageCode | null | undefined): string {
  if (typeof code !== 'string' || !code.trim()) return 'Chưa xác định';
  return languageNames[code] ?? code.toUpperCase();
}
export function formatLanguagePair(project: Project): string { return `${formatLanguageName(project.sourceLanguage)} → ${project.targetLanguage ? formatLanguageName(project.targetLanguage) : '—'}`; }
export function formatRelativeDate(value: string): string { const elapsed = Math.max(0, Date.now() - new Date(value).getTime()); const minutes = Math.floor(elapsed / 60_000); if (minutes < 1) return 'Vừa xong'; if (minutes < 60) return `${minutes} phút trước`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours} giờ trước`; if (hours < 48) return 'Hôm qua'; return new Intl.DateTimeFormat('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
export function calculateProjectStatistics(projects: readonly Project[]): ProjectStatistics { return { total: projects.length, completed: projects.filter((project) => project.status === 'COMPLETED').length, processing: projects.filter((project) => isProcessingStatus(project.status)).length, failed: projects.filter((project) => project.status === 'FAILED').length }; }
export function getRecentProjects(projects: readonly Project[], limit = 4): Project[] { return [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, limit); }
export function matchesStatusFilter(status: ProjectStatus, filter: ProjectStatusFilter): boolean { if (filter === 'ALL') return true; return status === filter; }
export function filterProjects(projects: readonly Project[], query: string, status: ProjectStatusFilter): Project[] { const normalizedQuery = query.trim().toLocaleLowerCase(); return projects.filter((project) => (!normalizedQuery || project.name.toLocaleLowerCase().includes(normalizedQuery)) && matchesStatusFilter(project.status, status)); }
