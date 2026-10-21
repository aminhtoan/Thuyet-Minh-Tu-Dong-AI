import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import { type GroupProvider, type GroupProviderInput, mapGroupResponse, responseSchema, groupTranslationInstructions } from './gemini-group-translation.provider.js';
import { GeminiTranslationError, mapGeminiTranslationError } from './gemini-translation.provider.js';
import { boundedTranslationFetch } from './bounded-fetch.js';
import { assertDispatchScope } from './controlled-development.js';
import type { OneUsePermitFence } from './one-use-permit.js';

// The SDK owns request serialization; the local fetch is the ONLY network path.
// Global fetch is denied by execution startup. No keys are placed in process.env.
export class ControlledGeminiProvider implements GroupProvider {
  constructor(private readonly fence: OneUsePermitFence, private readonly apiKey: string,
    private readonly verifySource: () => Promise<void>, private readonly fetcher: typeof fetch,
    private readonly usage: (counts: Record<string, number>) => void = () => {}) {}
  async translate(input: GroupProviderInput) {
    assertDispatchScope(this.fence);
    const p = this.fence.permit;
    this.fence.assertInput(p.model, input); // Before even the metadata request.
    if (!this.apiKey.trim()) throw new GeminiTranslationError('TRANSLATION_NOT_CONFIGURED');
    const signal = AbortSignal.timeout(p.timeoutMs);
    let phase: 'metadata' | 'generation' = 'metadata';
    const dispatched = { metadata: false, generation: false };
    const bounded = boundedTranslationFetch(this.fetcher);
    const guardedFetch: typeof fetch = async (request, init) => {
      assertDispatchScope(this.fence); signal.throwIfAborted();
      const url = new URL(typeof request === 'string' ? request : request instanceof URL ? request.href : request.url);
      const method = (init?.method ?? (request instanceof Request ? request.method : 'GET')).toUpperCase();
      const suffix = phase === 'generation' ? ':generateContent' : '';
      if (url.origin !== 'https://generativelanguage.googleapis.com' || url.pathname !== `/v1beta/models/${p.model}${suffix}` || url.search || method !== (phase === 'metadata' ? 'GET' : 'POST') || dispatched[phase]) throw new Error('CONTROLLED_SDK_DISPATCH_DENIED');
      dispatched[phase] = true; // Prevent even an unexpected SDK retry inside a claim.
      return bounded(request, { ...init, redirect: 'error', signal });
    };
    const ai = new GoogleGenAI({ apiKey: this.apiKey, vertexai: false,
      httpOptions: { apiVersion: p.apiVersion, baseUrl: 'https://generativelanguage.googleapis.com', timeout: p.timeoutMs, retryOptions: { attempts: 1 }, fetch: guardedFetch } });
    try {
      await this.fence.metadata(p.model, this.verifySource, async () => {
        const model = await ai.models.get({ model: p.model, config: { abortSignal: signal } });
        if (model.name !== p.model && model.name !== `models/${p.model}`) throw new GeminiTranslationError('TRANSLATION_MODEL_UNAVAILABLE');
        return model;
      });
      phase = 'generation';
      const response = await this.fence.generation(p.model, input, this.verifySource, async () => {
        const result = await ai.models.generateContent({ model: p.model, contents: JSON.stringify(input), config: {
          systemInstruction: groupTranslationInstructions, responseMimeType: 'application/json', responseJsonSchema: z.toJSONSchema(responseSchema),
          candidateCount: 1, maxOutputTokens: p.maxOutputTokens, abortSignal: signal,
          ...(p.thinking === 'LOW' ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        } });
        const counts: Record<string, number> = {};
        for (const key of ['promptTokenCount', 'candidatesTokenCount', 'thoughtsTokenCount', 'totalTokenCount'] as const) {
          const value = result.usageMetadata?.[key];
          if (Number.isSafeInteger(value) && value! >= 0) counts[key] = value!;
        }
        this.usage(counts); // Numeric usage only; never response/thought/text.
        return { text: result.text, finishReason: result.candidates?.[0]?.finishReason };
      });
      if (response.finishReason !== 'STOP') throw new GeminiTranslationError('TRANSLATION_INVALID_RESPONSE');
      return mapGroupResponse(response.text, input);
    } catch (error) { throw mapGeminiTranslationError(error); }
  }
}
