import { GeminiTranslationError } from './gemini-translation.provider.js';

// Conservative transport policy using the existing 128 KiB draft ceiling.
// This includes the SDK envelope, so it may reject a response before draft validation.
export const PROVIDER_RESPONSE_BYTE_LIMIT = 128 * 1024;
export function boundedTranslationFetch(fetcher: typeof fetch = globalThis.fetch): typeof fetch {
  return async (input, init) => {
    const response = await fetcher(input, init);
    const reader = response.body?.getReader();
    if (!reader) return response;
    let bytes = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await reader.read();
          if (next.done) { controller.close(); reader.releaseLock(); return; }
          bytes += next.value.byteLength;
          if (bytes > PROVIDER_RESPONSE_BYTE_LIMIT) {
            // Cancel upstream before any over-limit chunk reaches SDK buffering/parsing.
            void reader.cancel().finally(() => reader.releaseLock()).catch(() => undefined);
            controller.error(new GeminiTranslationError('TRANSLATION_INVALID_RESPONSE'));
            return;
          }
          controller.enqueue(next.value);
        } catch (error) { reader.releaseLock(); controller.error(error); }
      },
      async cancel(reason) { try { await reader.cancel(reason); } finally { reader.releaseLock(); } },
    }, { highWaterMark: 0 });
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}
