import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File, Paths } from 'expo-file-system';
import { preparePickerFile } from './pickerFilePreparation.mjs';
import { safeUploadFileName } from './nativeUploadContract.mjs';
import { describeUploadUri, safeUploadError, uploadDiagnostic } from './uploadDiagnostics';

export type PreparedUploadFile = {
  uploadUri: string;
  copied: boolean;
  cleanup: (succeeded: boolean) => Promise<void>;
};

export async function prepareUploadFile(uri: string, fileName: string, projectId: string, fileSize?: number): Promise<PreparedUploadFile> {
  const cacheDirectory = Paths.cache.uri;
  if (!cacheDirectory) throw new Error('Không thể đọc tệp đã chọn. Vui lòng chọn lại tệp.');
  const location = describeUploadUri(uri, cacheDirectory);
  uploadDiagnostic('prepare:start', { ...location, fileSize });
  return preparePickerFile(
    { uri, fileName: safeUploadFileName(fileName), projectId },
    {
      cacheDirectory,
      getInfo: (target: string) => FileSystem.getInfoAsync(target),
      diagnose: (operation: string, details?: { error?: unknown; exists?: boolean; isDirectory?: boolean; size?: number; method?: string; destinationCacheLocation?: string }) => uploadDiagnostic(operation, {
        ...location,
        fileSize,
        exists: details?.exists,
        isDirectory: details?.isDirectory,
        detectedSize: details?.size,
        method: details?.method,
        destinationCacheLocation: details?.destinationCacheLocation,
        error: details?.error ? safeUploadError(details.error) : undefined,
      }),
      makeDirectory: (target: string) => new Directory(target).create({ intermediates: true, idempotent: true }),
      materialize: async (from: string, to: string) => {
        await new File(from).copy(new File(to));
      },
      delete: (target: string) => FileSystem.deleteAsync(target, { idempotent: true }),
    },
  ) as Promise<PreparedUploadFile>;
}
