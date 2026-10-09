import type { DocumentPickerAsset } from 'expo-document-picker';
import { api } from '../../lib/api';
import type { LanguageCode } from './types';
import { resolveUploadMimeType } from './uploadMetadata.mjs';

export type UploadOptions = { projectName: string; sourceLanguage: LanguageCode; file: DocumentPickerAsset; signal: AbortSignal; onProgress: (progress: number) => void };
type CreatedProject = { project: { id: string } };

export async function uploadProjectMedia({ projectName, sourceLanguage, file, signal, onProgress }: UploadOptions): Promise<string> {
  onProgress(0);
  const { project } = await api<CreatedProject>('/projects', { method: 'POST', signal, body: JSON.stringify({ name: projectName, sourceLanguage }) });
  try {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: resolveUploadMimeType(file.name) } as unknown as Blob);
    await api(`/projects/${project.id}/media`, { method: 'POST', signal, body: form });
    await (await import('./projectRepository')).projectRepository.refresh();
    onProgress(100);
    return project.id;
  } catch (error) {
    try { await api(`/projects/${project.id}`, { method: 'DELETE' }); } catch { /* Chỉ dọn dự án rỗng do lượt tải lên này tạo. */ }
    throw error;
  }
}
