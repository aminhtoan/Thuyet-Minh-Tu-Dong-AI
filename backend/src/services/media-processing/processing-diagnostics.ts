export type ProcessingStage = 'PROBE' | 'PROBE_SOURCE' | 'PROBE_NARRATION' | 'RENDER' | 'PROBE_OUTPUT' | 'VALIDATE_INPUT' | 'VALIDATE_OUTPUT' | 'PREPARE_OUTPUT' | 'PERSIST_RESULT' | 'FINALIZE_RESULT';
export type ProcessingDiagnostics = {
  stage: ProcessingStage; code: string; durationMs: number;
  exitCode?: number | null; signal?: string | null; systemCode?: string; stderr?: string;
  errorName?: string;
};

export function sanitizeProcessingStderr(value: string, paths: readonly string[] = []): string {
  let text = value.slice(-16_384);
  for (const path of [...paths].sort((a, b) => b.length - a.length)) if (path) text = text.split(path).join('[PATH]');
  for (const [key, secret] of Object.entries(process.env)) {
    if (secret && secret.length >= 6 && /KEY|TOKEN|SECRET|PASSWORD|URI/i.test(key)) text = text.split(secret).join('[REDACTED]');
  }
  return text.split(/\r?\n/).filter(line => /error|invalid|denied|failed|unable|unsupported|not found|no such|unknown encoder|could not/i.test(line))
    .map(line => line.replace(/(?:mongodb(?:\+srv)?|https?):\/\/\S+/gi, '[URL]')
      .replace(/Bearer\s+\S+|\b(?:sk-|AIza)[A-Za-z0-9_-]+|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED]')
      .replace(/[A-Za-z]:[\\/][^\r\n"']*/g, '[PATH]')
      .replace(/(?:^|\s)\/(?:[^\s"']+[/])+[^\s"']*/g, ' [PATH]')
      .replace(/["'][^"']*["']/g, '[VALUE]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]'))
    .join('\n').slice(-2000);
}

export class MediaProcessingError extends Error {
  constructor(public readonly diagnostics: ProcessingDiagnostics) { super(diagnostics.code); this.name = 'MediaProcessingError'; }
}
export function processingFailure(error: unknown, stage: ProcessingStage, durationMs: number): ProcessingDiagnostics {
  if (error instanceof MediaProcessingError) return error.diagnostics;
  const code = error instanceof Error && ['FFMPEG_NOT_AVAILABLE', 'MEDIA_PROCESSING_TIMEOUT', 'MEDIA_PROCESSING_INVALID_OUTPUT', 'MEDIA_PROCESSING_SOURCE_CHANGED'].includes(error.message) ? error.message : 'MEDIA_PROCESSING_FAILED';
  const failure = error as { name?: unknown; code?: unknown } | null;
  const errorName = typeof failure?.name === 'string' && /^(Error|TypeError|ReferenceError|ValidationError|MongoServerError|MongoTransactionError|MongoNetworkError|MongoServerSelectionError)$/.test(failure.name) ? failure.name : undefined;
  const systemCode = typeof failure?.code === 'number' && Number.isSafeInteger(failure.code) ? String(failure.code) : undefined;
  return { stage, code, durationMs, ...(errorName && errorName !== 'Error' ? { errorName } : {}), ...(systemCode ? { systemCode } : {}) };
}
