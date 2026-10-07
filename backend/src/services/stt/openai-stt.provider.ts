import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import type { SttInput, SttProvider, SttResult } from './stt-provider.interface.js';

const MAX_PROVIDER_BYTES = 25 * 1024 * 1024;

export interface OpenAiSttDiagnostics {
  provider: 'openai';
  httpStatus?: number;
  errorType?: string;
  errorCode?: string;
  message: string;
  requestId?: string;
}

const safeText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  return value
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, '[REDACTED]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 500);
};

export class OpenAiSttError extends Error {
  public readonly diagnostics: OpenAiSttDiagnostics;

  public constructor(diagnostics: Omit<OpenAiSttDiagnostics, 'provider'>) {
    super('STT_PROVIDER_ERROR');
    this.name = 'OpenAiSttError';
    this.diagnostics = { provider: 'openai', ...diagnostics };
  }
}

const createHttpError = async (response: Response): Promise<OpenAiSttError> => {
  let body: { error?: { type?: unknown; code?: unknown; message?: unknown } } = {};
  try { body = JSON.parse((await response.text()).slice(0, 10_000)) as typeof body; } catch { /* non-JSON provider response */ }
  return new OpenAiSttError({
    httpStatus: response.status,
    errorType: typeof body.error?.type === 'string' ? safeText(body.error.type, 'unknown') : undefined,
    errorCode: typeof body.error?.code === 'string' ? safeText(body.error.code, 'unknown') : undefined,
    message: safeText(body.error?.message, `OpenAI request failed with HTTP ${response.status}.`),
    requestId: safeText(response.headers.get('x-request-id'), '') || undefined,
  });
};

export class OpenAiSttProvider implements SttProvider {
  public async transcribe(input: SttInput): Promise<SttResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error('STT_NOT_CONFIGURED');
    if ((await stat(input.filePath)).size > MAX_PROVIDER_BYTES) throw new Error('STT_FILE_TOO_LARGE');
    const form = new FormData();
    form.append('file', new Blob([await readFile(input.filePath)], { type: input.mimeType }), basename(input.filePath));
    form.append('model', process.env.STT_MODEL?.trim() || 'whisper-1');
    form.append('language', input.language.split('-')[0] ?? input.language);
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      if (timedOut) throw new Error('STT_TIMEOUT');
      throw new OpenAiSttError({ errorType: error instanceof Error ? safeText(error.name, 'NetworkError') : 'NetworkError', message: 'Không thể kết nối đến OpenAI.' });
    }
    if (!response.ok) throw await createHttpError(response);
    const value = await response.json() as { text?: unknown; language?: unknown; duration?: unknown; segments?: unknown };
    if (typeof value.text !== 'string' || !Array.isArray(value.segments)) throw new Error('STT_INVALID_RESPONSE');
    const segments = value.segments.map((segment) => segment as { start?: unknown; end?: unknown; text?: unknown })
      .filter((segment) => typeof segment.start === 'number' && typeof segment.end === 'number' && typeof segment.text === 'string')
      .map((segment) => ({ start: segment.start as number, end: segment.end as number, text: (segment.text as string).trim() }));
    if (!segments.length || segments.some((segment) => segment.start < 0 || segment.end < segment.start || !segment.text)) throw new Error('STT_INVALID_RESPONSE');
    return { text: value.text.trim(), language: typeof value.language === 'string' ? value.language : undefined, duration: typeof value.duration === 'number' ? value.duration : undefined, segments };
  }
}
