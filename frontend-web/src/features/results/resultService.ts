import { api, apiBlob } from '../../lib/api';
import { projectRepository } from '../projects/projectRepository';
import type { LanguageCode } from '../projects/types';
import type { HistoryItem, Result } from './types';

type VideoResultDto = { id: string; projectId: string; narrationId: string; targetLanguage: string; mimeType: string; fileSize: number; duration: number; width: number | null; height: number | null; fileUrl: string; createdAt: string };
type NarrationDto = { id: string; projectId: string; targetLanguage: string; voice: { id: string; name: string }; speed: number; mimeType: string; fileSize: number; duration: number | null; audioUrl: string; createdAt: string };

const newest = <T extends { createdAt: string }>(items: T[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

export const resultService = {
  async getByProjectId(projectId: string, language?: LanguageCode): Promise<Result | null> {
    const [{ results }, { narrations }] = await Promise.all([
      api<{ results: VideoResultDto[] }>(`/projects/${projectId}/results`),
      api<{ narrations: NarrationDto[] }>(`/projects/${projectId}/narrations`),
    ]);
    const video = newest(results.filter((item) => !language || item.targetLanguage === language));
    if (video) return { id: video.id, projectId, languageCode: video.targetLanguage, mediaType: 'VIDEO', artifactType: 'VIDEO', createdAt: video.createdAt, mimeType: video.mimeType, fileSize: video.fileSize, duration: video.duration, width: video.width, height: video.height, filePath: video.fileUrl };
    const audio = newest(narrations.filter((item) => !language || item.targetLanguage === language));
    if (!audio) return null;
    return { id: audio.id, projectId, languageCode: audio.targetLanguage, mediaType: 'AUDIO', artifactType: 'AUDIO', createdAt: audio.createdAt, mimeType: audio.mimeType, fileSize: audio.fileSize, duration: audio.duration ?? undefined, voiceName: audio.voice.name, speed: audio.speed, filePath: audio.audioUrl };
  },
  getFile: (result: Result) => apiBlob(result.filePath),
  async getHistory(): Promise<HistoryItem[]> {
    return Promise.all(projectRepository.getAll().map(async (project) => {
      try { return { ...project, hasResult: Boolean(await resultService.getByProjectId(project.id)) }; }
      catch { return { ...project, hasResult: false }; }
    })).then((items) => items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  },
};
