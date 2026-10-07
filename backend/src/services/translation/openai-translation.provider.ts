import type { TranslationProvider, TranslationProviderInput, TranslationProviderResult } from './translation-provider.interface.js';

export interface OpenAiTranslationDiagnostics {
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

export class OpenAiTranslationError extends Error {
  public readonly diagnostics: OpenAiTranslationDiagnostics;

  public constructor(diagnostics: Omit<OpenAiTranslationDiagnostics, 'provider'>) {
    super('TRANSLATION_PROVIDER_ERROR');
    this.name = 'OpenAiTranslationError';
    this.diagnostics = { provider: 'openai', ...diagnostics };
  }
}

const httpError = async (response: Response): Promise<OpenAiTranslationError> => {
  let body: { error?: { type?: unknown; code?: unknown; message?: unknown } } = {};
  try { body = JSON.parse((await response.text()).slice(0, 10_000)) as typeof body; } catch { /* non-JSON response */ }
  return new OpenAiTranslationError({
    httpStatus: response.status,
    errorType: typeof body.error?.type === 'string' ? safeText(body.error.type, 'unknown') : undefined,
    errorCode: typeof body.error?.code === 'string' ? safeText(body.error.code, 'unknown') : undefined,
    message: safeText(body.error?.message, `OpenAI request failed with HTTP ${response.status}.`),
    requestId: safeText(response.headers.get('x-request-id'), '') || undefined,
  });
};

const outputText = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const response = value as { output_text?: unknown; output?: Array<{ content?: Array<{ type?: unknown; text?: unknown }> }> };
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output ?? []) for (const content of item.content ?? []) {
    if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
  }
  return undefined;
};

export class OpenAiTranslationProvider implements TranslationProvider {
  public async translate(input: TranslationProviderInput): Promise<TranslationProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const model = process.env.TRANSLATION_MODEL?.trim();
    if (!apiKey || !model) throw new Error('TRANSLATION_NOT_CONFIGURED');
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          instructions: 'Translate only. Preserve meaning, segment order, and every index. Do not summarize, omit, merge, add commentary, or invent timestamps.',
          input: JSON.stringify(input),
          text: { format: { type: 'json_schema', name: 'translated_segments', strict: true, schema: {
            type: 'object', additionalProperties: false, required: ['segments'], properties: { segments: { type: 'array', items: {
              type: 'object', additionalProperties: false, required: ['index', 'text'], properties: { index: { type: 'integer' }, text: { type: 'string' } },
            } } },
          } } },
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      if (timedOut) throw new Error('TRANSLATION_TIMEOUT');
      throw new OpenAiTranslationError({ errorType: error instanceof Error ? safeText(error.name, 'NetworkError') : 'NetworkError', message: 'Không thể kết nối đến OpenAI.' });
    }
    if (!response.ok) throw await httpError(response);
    const text = outputText(await response.json());
    if (!text) throw new Error('TRANSLATION_INVALID_RESPONSE');
    try {
      const parsed = JSON.parse(text) as { segments?: unknown };
      if (!Array.isArray(parsed.segments)) throw new Error();
      return { sourceLanguage: input.sourceLanguage, targetLanguage: input.targetLanguage, segments: parsed.segments as TranslationProviderResult['segments'] };
    } catch { throw new Error('TRANSLATION_INVALID_RESPONSE'); }
  }
}
