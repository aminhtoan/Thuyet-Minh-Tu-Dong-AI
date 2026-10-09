const mimeByExtension = Object.freeze({
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
});

export function resolveUploadMimeType(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return mimeByExtension[extension] ?? 'application/octet-stream';
}
