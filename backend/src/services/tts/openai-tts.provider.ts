import type { TtsProvider, TtsProviderInput, TtsProviderResult } from './tts-provider.interface.js';

export interface OpenAiTtsDiagnostics {
  provider: 'openai';
  httpStatus?: number;
  errorType?: string;
  errorCode?: string;
  message: string;
  requestId?: string;
}

const safeText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  return value.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]').replace(/\bsk-[A-Za-z0-9_-]+\b/g, '[REDACTED]').replace(/[\r\n\t]+/g, ' ').slice(0, 500);
};

export class OpenAiTtsError extends Error {
  public readonly diagnostics: OpenAiTtsDiagnostics;
  public constructor(diagnostics: Omit<OpenAiTtsDiagnostics, 'provider'>) {
    super('TTS_PROVIDER_ERROR'); this.name = 'OpenAiTtsError'; this.diagnostics = { provider: 'openai', ...diagnostics };
  }
}

const httpError = async (response: Response): Promise<OpenAiTtsError> => {
  let body: { error?: { type?: unknown; code?: unknown; message?: unknown } } = {};
  try { body = JSON.parse((await response.text()).slice(0, 10_000)) as typeof body; } catch { /* non-JSON response */ }
  return new OpenAiTtsError({
    httpStatus: response.status,
    errorType: typeof body.error?.type === 'string' ? safeText(body.error.type, 'unknown') : undefined,
    errorCode: typeof body.error?.code === 'string' ? safeText(body.error.code, 'unknown') : undefined,
    message: safeText(body.error?.message, `OpenAI request failed with HTTP ${response.status}.`),
    requestId: safeText(response.headers.get('x-request-id'), '') || undefined,
  });
};

export class OpenAiTtsProvider implements TtsProvider {
  public async synthesize(input: TtsProviderInput): Promise<TtsProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim(); const model = process.env.TTS_MODEL?.trim();
    if (!apiKey || !model || process.env.TTS_AUDIO_FORMAT?.trim().toLowerCase() !== 'mp3') throw new Error('TTS_NOT_CONFIGURED');
    if (input.text.length > 4096) throw new Error('TTS_TEXT_TOO_LARGE');
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, input: input.text, voice: input.voice, response_format: input.format }), signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      if (timedOut) throw new Error('TTS_TIMEOUT');
      throw new OpenAiTtsError({ errorType: error instanceof Error ? safeText(error.name, 'NetworkError') : 'NetworkError', message: 'Không thể kết nối đến OpenAI.' });
    }
    if (!response.ok) throw await httpError(response);
    const audio = new Uint8Array(await response.arrayBuffer());
    if (!audio.byteLength) throw new Error('TTS_INVALID_RESPONSE');
    return { audio, format: 'mp3', mimeType: 'audio/mpeg', provider: 'openai', model };
  }
}
