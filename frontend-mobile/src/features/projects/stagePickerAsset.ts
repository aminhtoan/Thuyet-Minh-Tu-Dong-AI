import type { DocumentPickerAsset } from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { safeUploadFileName } from './nativeUploadContract.mjs';
import { stageFreshPickerAsset } from './pickerStaging.mjs';
import { safeUploadError, uploadDiagnostic } from './uploadDiagnostics';

export type StagedPickerAsset = {
  asset: DocumentPickerAsset;
  cleanup: () => Promise<void>;
};

export async function stagePickerAsset(asset: DocumentPickerAsset): Promise<StagedPickerAsset> {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return stageFreshPickerAsset(asset, {
    createDirectory: () => new Directory(Paths.cache, 'picker-uploads', id).uri,
    destination: (directory: string, name: string) => new File(new Directory(directory), safeUploadFileName(name)).uri,
    scheme: (uri: string) => uri.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase() ?? 'unknown',
    makeDirectory: (uri: string) => new Directory(uri).create({ intermediates: true, idempotent: true }),
    copyExact: async (from: string, to: string) => { await new File(from).copy(new File(to)); },
    getInfo: (uri: string) => LegacyFileSystem.getInfoAsync(uri),
    delete: (uri: string) => LegacyFileSystem.deleteAsync(uri, { idempotent: true }),
    diagnose: (operation: string, details?: { size?: number; scheme?: string; exists?: boolean; destinationCacheLocation?: string; error?: unknown }) => uploadDiagnostic(operation, {
      sourceScheme: details?.scheme,
      pickerSize: asset.size,
      detectedSize: details?.size,
      exists: details?.exists,
      destinationCacheLocation: details?.destinationCacheLocation,
      error: details?.error ? safeUploadError(details.error) : undefined,
    }),
  }) as Promise<StagedPickerAsset>;
}
