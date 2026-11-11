import { trackedObject } from '../../maintenance/runtime.js';
import type { SttProvider } from './stt-provider.interface.js';
import { OpenAiSttProvider } from './openai-stt.provider.js';
import { GeminiSttProvider } from './gemini-stt.provider.js';

let testProvider: SttProvider | undefined;
export const setSttProviderForTests = (provider?: SttProvider): void => { testProvider = provider; };
export const getSttProvider = (): SttProvider => {
  if (testProvider) return trackedObject(testProvider, 'providerCalls');
  const provider = process.env.STT_PROVIDER?.trim() || 'gemini';
  if (provider === 'gemini') return trackedObject(new GeminiSttProvider(), 'providerCalls');
  if (provider !== 'openai') throw new Error('STT_NOT_CONFIGURED');
  return trackedObject(new OpenAiSttProvider(), 'providerCalls');
};
