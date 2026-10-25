import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { env } from '../../config/env';
import { api, refreshSession, session } from '../../lib/api';
import { projectRepository } from '../projects/projectRepository';
import type { LanguageCode } from '../projects/types';
import type { HistoryItem, Result } from './types';
import { protectedResultUrl } from './resultMedia';
type VideoResultDto = { id: string; targetLanguage: string; mimeType: string; fileSize: number; duration: number; fileUrl: string; createdAt: string };
type NarrationDto = { id: string; targetLanguage: string; voice: { name: string }; speed: number; mimeType: string; fileSize: number; duration: number | null; audioUrl: string; createdAt: string };
const newest = <T extends { createdAt: string }>(items: T[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

function buildAudioUrl(filePath: string) {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const base = env.apiBaseUrl.replace(/\/+$/, '');
  const clean = filePath.startsWith('/') ? filePath : `/${filePath}`;
  if (clean.startsWith('/api/')) {
    return `${base.replace(/\/api$/, '')}${clean}`;
  }
  return `${base}${clean}`;
}

/**
 * Web-compatible alternative: uses fetch + Blob URL instead of expo-file-system.
 * Returns a blob: URI that works with expo-audio on web.
 */
async function downloadProtectedWeb(result: Result, retry = true): Promise<string> {
  const token = (await session.get())?.accessToken;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(buildAudioUrl(result.filePath), { headers });
  if (response.status === 401 && retry && token) {
    if (await refreshSession()) return downloadProtectedWeb(result, false);
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }
  if (!response.ok) throw new Error(`Không thể tải tệp (HTTP ${response.status}).`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

async function downloadProtected(result: Result, retry = true): Promise<string> {
  if (Platform?.OS === 'web' || !FileSystem.cacheDirectory) {
    return downloadProtectedWeb(result, retry);
  }
  const url = protectedResultUrl(env.apiBaseUrl, result);
  const token = (await session.get())?.accessToken;
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
  if (!FileSystem.cacheDirectory) throw new Error('Thiết bị không cung cấp thư mục tạm.');
  const destination = `${FileSystem.cacheDirectory}narration-${encodeURIComponent(result.id)}-${Date.now()}.${result.artifactType === 'VIDEO' ? 'mp4' : 'mp3'}`;
  try {
    const response = await FileSystem.downloadAsync(url, destination, { headers: { Authorization: `Bearer ${token}` } });
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

export interface LanguageVariant {
  projectId: string;
  language: string;
  name: string;
  flag: string;
  hasResult: boolean;
  status: string;
  isCurrent: boolean;
}

export const resultService = {
  async getByProjectId(projectId: string, language?: LanguageCode): Promise<Result | null> { const [{ results }, { narrations }] = await Promise.all([api<{ results: VideoResultDto[] }>(`/projects/${projectId}/results`), api<{ narrations: NarrationDto[] }>(`/projects/${projectId}/narrations`)]); const video = newest(results.filter((item) => !language || item.targetLanguage === language)); if (video) return { id: video.id, projectId, languageCode: video.targetLanguage, mediaType: 'VIDEO', artifactType: 'VIDEO', createdAt: video.createdAt, mimeType: video.mimeType, fileSize: video.fileSize, duration: video.duration, filePath: video.fileUrl }; const audio = newest(narrations.filter((item) => !language || item.targetLanguage === language)); return audio ? { id: audio.id, projectId, languageCode: audio.targetLanguage, mediaType: 'AUDIO', artifactType: 'AUDIO', createdAt: audio.createdAt, mimeType: audio.mimeType, fileSize: audio.fileSize, duration: audio.duration ?? undefined, voiceName: audio.voice.name, speed: audio.speed, filePath: audio.audioUrl } : null; },
  async getLanguageVariants(projectId: string, currentLanguage?: string): Promise<LanguageVariant[]> {
    try {
      const url = currentLanguage
        ? `/projects/${projectId}/language-variants?language=${encodeURIComponent(currentLanguage)}`
        : `/projects/${projectId}/language-variants`;
      const response = await api<{ variants: LanguageVariant[] }>(url);
      return response.variants;
    } catch {
      return [];
    }
  },
  downloadProtected,
  downloadProtectedWeb,
  cleanup: async (uri: string) => {
    if (!uri) return;
    if (Platform.OS === 'web' || uri.startsWith('blob:') || !FileSystem.cacheDirectory) {
      try { URL.revokeObjectURL(uri); } catch { /* ignore */ }
      return;
    }
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch { /* ignore */ }
  },
  cleanupWeb: (blobUrl: string) => { try { URL.revokeObjectURL(blobUrl); } catch { /* ignore */ } },
  async getHistory(): Promise<HistoryItem[]> { return Promise.all(projectRepository.getAll().map(async (project) => { try { return { ...project, hasResult: Boolean(await resultService.getByProjectId(project.id)) }; } catch { return { ...project, hasResult: false }; } })).then((items) => items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); },
};

