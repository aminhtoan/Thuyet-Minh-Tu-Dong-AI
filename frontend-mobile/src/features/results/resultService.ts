import * as FileSystem from 'expo-file-system/legacy';
import { env } from '../../config/env';
import { api, refreshSession, session } from '../../lib/api';
import { projectRepository } from '../projects/projectRepository';
import type { LanguageCode } from '../projects/types';
import type { HistoryItem, Result } from './types';
type VideoResultDto = { id: string; targetLanguage: string; mimeType: string; fileSize: number; duration: number; fileUrl: string; createdAt: string };
type NarrationDto = { id: string; targetLanguage: string; voice: { name: string }; speed: number; mimeType: string; fileSize: number; duration: number | null; audioUrl: string; createdAt: string };
const newest = <T extends { createdAt: string }>(items: T[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

async function downloadProtected(result: Result, retry = true): Promise<string> {
  const token = (await session.get())?.accessToken;
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
  if (!FileSystem.cacheDirectory) throw new Error('Thiết bị không cung cấp thư mục tạm.');
  const destination = `${FileSystem.cacheDirectory}narration-${result.id}.${result.artifactType === 'VIDEO' ? 'mp4' : 'mp3'}`;
  try {
    const response = await FileSystem.downloadAsync(`${env.apiBaseUrl}${result.filePath.replace(/^\/api/, '')}`, destination, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401 && retry) {
      await FileSystem.deleteAsync(destination, { idempotent: true });
      if (await refreshSession()) return downloadProtected(result, false);
    }
    if (response.status < 200 || response.status >= 300) {
      await FileSystem.deleteAsync(destination, { idempotent: true });
      throw new Error(`Không thể tải tệp (HTTP ${response.status}).`);
    }
    return response.uri;
  } catch (error) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    if (error instanceof Error && error.message.startsWith('Không thể tải tệp')) throw error;
    throw new Error('Không thể tải tệp được bảo vệ. Vui lòng kiểm tra kết nối mạng.');
  }
}

export const resultService = {
  async getByProjectId(projectId: string, language?: LanguageCode): Promise<Result | null> { const [{ results }, { narrations }] = await Promise.all([api<{ results: VideoResultDto[] }>(`/projects/${projectId}/results`), api<{ narrations: NarrationDto[] }>(`/projects/${projectId}/narrations`)]); const video = newest(results.filter((item) => !language || item.targetLanguage === language)); if (video) return { id: video.id, projectId, languageCode: video.targetLanguage, mediaType: 'VIDEO', artifactType: 'VIDEO', createdAt: video.createdAt, mimeType: video.mimeType, fileSize: video.fileSize, duration: video.duration, filePath: video.fileUrl }; const audio = newest(narrations.filter((item) => !language || item.targetLanguage === language)); return audio ? { id: audio.id, projectId, languageCode: audio.targetLanguage, mediaType: 'AUDIO', artifactType: 'AUDIO', createdAt: audio.createdAt, mimeType: audio.mimeType, fileSize: audio.fileSize, duration: audio.duration ?? undefined, voiceName: audio.voice.name, speed: audio.speed, filePath: audio.audioUrl } : null; },
  downloadProtected,
  cleanup: (uri: string) => FileSystem.deleteAsync(uri, { idempotent: true }),
  async getHistory(): Promise<HistoryItem[]> { return Promise.all(projectRepository.getAll().map(async (project) => { try { return { ...project, hasResult: Boolean(await resultService.getByProjectId(project.id)) }; } catch { return { ...project, hasResult: false }; } })).then((items) => items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); },
};
