import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import { env } from '../../config/env';
import { ApiError, refreshSession, session } from '../../lib/api';
import { createNativeUploadContract, invokeNativeUpload, isNativeUploadFileUri } from './nativeUploadContract.mjs';
import { shouldRetryNativeUpload } from './nativeUploadRetry.mjs';
import { describeUploadUri, safeUploadError, uploadDiagnostic } from './uploadDiagnostics';

type ErrorEnvelope = { success: false; error: { code: string; message: string } };
type UploadProgress = { totalBytesSent: number; totalBytesExpectedToSend: number };
type NativeUploadInput = {
  projectId: string;
  fileUri: string;
  mimeType: string;
  fileSize?: number;
  signal: AbortSignal;
  onProgress: (progress: number) => void;
};

function responseError(status: number, body: string) {
  try {
    const parsed = JSON.parse(body) as ErrorEnvelope;
    if (!parsed.success && parsed.error) return new ApiError(parsed.error.code, parsed.error.message, status);
  } catch {
    // Non-JSON proxy/server responses stay sanitized below.
  }
  if (status === 413) return new ApiError('FILE_TOO_LARGE', 'Tệp vượt quá dung lượng cho phép.', status);
  if (status >= 500) return new ApiError('SERVER_ERROR', 'Máy chủ không thể xử lý tệp. Vui lòng thử lại.', status);
  return new ApiError('UPLOAD_ERROR', 'Không thể tải tệp lên máy chủ.', status);
}

export async function uploadNativeMedia(input: NativeUploadInput, retry = true): Promise<void> {
  if (!isNativeUploadFileUri(input.fileUri)) {
    throw new ApiError('UPLOAD_URI_INVALID', 'Không thể đọc tệp đã chọn trên thiết bị. Vui lòng chọn lại tệp.', 0);
  }
  const token = (await session.get())?.accessToken;
  if (!token) throw new ApiError('AUTH_REQUIRED', 'Phiên đăng nhập đã hết hạn.', 401);
  const contract = createNativeUploadContract({ token, mimeType: input.mimeType });
  const location = describeUploadUri(input.fileUri, Paths.cache.uri);
  uploadDiagnostic('native-upload:start', { ...location, fileSize: input.fileSize, mimeType: input.mimeType });
  const task = invokeNativeUpload(FileSystem.createUploadTask, {
    url: `${env.apiBaseUrl}/projects/${input.projectId}/media`,
    fileUri: input.fileUri,
    options: { ...contract, uploadType: FileSystem.FileSystemUploadType.MULTIPART },
    onProgress: ({ totalBytesSent, totalBytesExpectedToSend }: UploadProgress) => {
      if (totalBytesExpectedToSend > 0) input.onProgress(Math.min(99, Math.round((totalBytesSent / totalBytesExpectedToSend) * 100)));
    },
  }) as FileSystem.UploadTask;
  const cancel = () => { void task.cancelAsync(); };
  input.signal.addEventListener('abort', cancel, { once: true });
  try {
    if (input.signal.aborted) { await task.cancelAsync(); throw new Error('UPLOAD_CANCELLED'); }
    const response = await task.uploadAsync();
    if (!response || input.signal.aborted) throw new Error('UPLOAD_CANCELLED');
    uploadDiagnostic('native-upload:response', { ...location, status: response.status, mimeType: input.mimeType });
    if (response.status === 401 && retry) {
      const refreshed = await refreshSession();
      if (shouldRetryNativeUpload(response.status, retry, refreshed)) return uploadNativeMedia(input, false);
    }
    if (response.status < 200 || response.status >= 300) throw responseError(response.status, response.body);
    input.onProgress(100);
  } catch (error) {
    uploadDiagnostic('native-upload:failure', { ...location, mimeType: input.mimeType, error: safeUploadError(error) });
    if (input.signal.aborted || (error instanceof Error && error.message === 'UPLOAD_CANCELLED')) throw new Error('Đã hủy tải lên.');
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (/no such file|not found|enoent/i.test(message)) throw new Error('Tệp đã chọn không còn tồn tại. Vui lòng chọn lại tệp.');
    if (/access|denied|permission|not readable|isn't readable/i.test(message)) throw new Error('Ứng dụng không có quyền đọc tệp đã chọn. Vui lòng chọn lại tệp.');
    if (/filesystem|not available|not implemented|unsupported/i.test(message)) throw new Error('FileSystem trên thiết bị không hỗ trợ thao tác tải lên này.');
    throw new Error('Không thể kết nối đến máy chủ để tải tệp lên.');
  } finally {
    input.signal.removeEventListener('abort', cancel);
  }
}
