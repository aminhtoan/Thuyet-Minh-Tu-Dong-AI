import type { DocumentPickerAsset } from 'expo-document-picker';
import { api } from '../../lib/api';
import type { LanguageCode } from './types';
import { uploadNativeMedia } from './nativeUpload';
import { executeProjectUpload } from './projectUploadFlow.mjs';
import { prepareUploadFile } from './prepareUploadFile';
import { resolveUploadMimeType } from './uploadMetadata.mjs';

export type UploadOptions = { projectName: string; description: string; sourceLanguage: LanguageCode; file: DocumentPickerAsset; signal: AbortSignal; onProgress: (progress: number) => void; retryProjectId?: string | null };
type CreatedProject = { project: { id: string } };
type UploadFlowResult = { ok: true; projectId: string } | { ok: false; error: unknown; retryProjectId: string | null };

export class ProjectUploadError extends Error {
  public constructor(message: string, public readonly retryProjectId: string | null) { super(message); }
}

export async function uploadProjectMedia({ projectName, description, sourceLanguage, file, signal, onProgress, retryProjectId }: UploadOptions): Promise<string> {
  onProgress(0);
  const project = { name: projectName, description, sourceLanguage };
  const result = await executeProjectUpload(
    { project, retryProjectId },
    {
      createProject: async (payload: typeof project) => (await api<CreatedProject>('/projects', { method: 'POST', signal, body: JSON.stringify(payload) })).project.id,
      updateProject: (id: string, payload: typeof project) => api(`/projects/${id}`, { method: 'PATCH', signal, body: JSON.stringify(payload) }),
      uploadFile: async (id: string) => {
        const mimeType = resolveUploadMimeType(file.name);
        const prepared = await prepareUploadFile(file.uri, file.name, id, file.size);
        let succeeded = false;
        try {
          await uploadNativeMedia({ projectId: id, fileUri: prepared.uploadUri, mimeType, fileSize: file.size, signal, onProgress });
          succeeded = true;
        } finally {
          await prepared.cleanup(succeeded);
        }
      },
      deleteProject: (id: string) => api(`/projects/${id}`, { method: 'DELETE' }),
      refreshProjects: async () => { await (await import('./projectRepository')).projectRepository.refresh(); },
    },
  ) as UploadFlowResult;
  if (result.ok) return result.projectId;
  const message = result.error instanceof Error ? result.error.message : 'Tải lên thất bại. Vui lòng thử lại.';
  throw new ProjectUploadError(message, result.retryProjectId);
}
