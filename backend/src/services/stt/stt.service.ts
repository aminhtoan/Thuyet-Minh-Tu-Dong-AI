import type { SttProvider } from './stt-provider.interface.js';
import { OpenAiSttProvider } from './openai-stt.provider.js';
import { GeminiSttProvider } from './gemini-stt.provider.js';

let testProvider: SttProvider | undefined;
export const setSttProviderForTests = (provider?: SttProvider): void => { testProvider = provider; };
export const getSttProvider = (): SttProvider => {
  if (testProvider) return testProvider;
  const provider = process.env.STT_PROVIDER?.trim() || 'gemini';
  if (provider === 'gemini') return new GeminiSttProvider();
  if (provider !== 'openai') throw new Error('STT_NOT_CONFIGURED');
  return new OpenAiSttProvider();
};
