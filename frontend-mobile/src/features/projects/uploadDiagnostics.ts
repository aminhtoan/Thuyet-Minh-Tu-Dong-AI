type DiagnosticValue = string | number | boolean | null | undefined | Record<string, unknown>;

function redactLocations(message: string) {
  return message.replace(/(?:file|content):\/\/\S+/gi, '[local-uri]');
}

export function safeUploadError(error: unknown) {
  if (!(error instanceof Error)) return { type: 'UnknownError', message: 'Unknown upload error' };
  return { type: error.name, message: redactLocations(error.message) };
}

export function describeUploadUri(uri: string, cacheDirectory?: string | null) {
  const scheme = uri.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase() ?? 'unknown';
  const cacheLocation = cacheDirectory && uri.startsWith(cacheDirectory)
    ? uri.includes('/DocumentPicker/') ? 'document-picker-cache' : 'app-cache'
    : 'outside-app-cache';
  return { scheme, cacheLocation };
}

export function uploadDiagnostic(operation: string, details: Record<string, DiagnosticValue>) {
  if (__DEV__) console.info('[mobile-upload]', { operation, ...details });
}
