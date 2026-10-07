import { projectRepository } from '../projects/projectRepository';
import type { GenerationContext, ProcessingSnapshot } from '../processing/types';
import type { LanguageCode } from '../projects/types';
import type { Result, HistoryItem } from './types';

const results = new Map<string, Result>();
export const downloadUnavailable = 'Chưa có file kết quả thực. Tải xuống sẽ khả dụng khi backend tạo media.';
export const resultService = {
  record(context: GenerationContext, snapshot: ProcessingSnapshot) {
    if (snapshot.status !== 'COMPLETED' || !snapshot.completedAt) return;
    const result: Result = {
      id: context.project.id + '-' + context.config.languageCode + '-' + snapshot.completedAt,
      projectId: context.project.id, languageCode: context.config.languageCode,
      mediaType: context.project.mediaType, createdAt: snapshot.completedAt, availability: 'MOCK_PREVIEW',
      transcriptCount: context.transcript.segments.length, translationCount: context.translation.segments.length,
      voiceName: context.voice.name, speed: context.config.speed,
    };
    results.set(result.projectId + ':' + result.languageCode, result);
  },
  async getByProjectId(projectId: string, language?: LanguageCode): Promise<Result | null> {
    const project = projectRepository.getById(projectId);
    if (!project) throw new Error('Không tìm thấy dự án');
    const saved = [...results.values()].filter(item => item.projectId === projectId && (!language || item.languageCode === language))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (saved) return { ...saved };
    if (project.status !== 'COMPLETED' || (language && language !== project.targetLanguage)) return null;
    // Existing S4 fixtures have no saved voice/segment metadata. Do not invent it.
    return { id: project.id + '-fixture', projectId, languageCode: project.targetLanguage,
      mediaType: project.mediaType, createdAt: project.updatedAt, availability: 'MOCK_PREVIEW' };
  },
  async getHistory(): Promise<HistoryItem[]> {
    return projectRepository.getAll().map(project => ({ ...project, hasResult: project.status === 'COMPLETED' ||
      [...results.values()].some(result => result.projectId === project.id) }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async getDownloadInfo(_projectId: string) {
    return { available: false as const, reason: downloadUnavailable };
  },
};

