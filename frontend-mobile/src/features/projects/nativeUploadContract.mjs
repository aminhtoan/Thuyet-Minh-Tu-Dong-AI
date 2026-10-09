export const MEDIA_UPLOAD_FIELD = 'file';

export function createNativeUploadContract({ token, mimeType }) {
  return Object.freeze({
    httpMethod: 'POST',
    fieldName: MEDIA_UPLOAD_FIELD,
    mimeType,
    headers: Object.freeze({ Authorization: `Bearer ${token}` }),
  });
}

export function safeUploadFileName(fileName) {
  return fileName.replace(/[\\/:*?"<>|]/g, '_').trim() || 'media-upload';
}

export function isNativeUploadFileUri(uri) {
  return uri.startsWith('file://');
}

export function invokeNativeUpload(createUploadTask, request) {
  return createUploadTask(request.url, request.fileUri, request.options, request.onProgress);
}
