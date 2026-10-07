import type { TtsProvider } from './tts-provider.interface.js';
import { OpenAiTtsProvider } from './openai-tts.provider.js';

let testProvider: TtsProvider | undefined;
export const getTtsProvider = (): TtsProvider => {
  if (testProvider) return testProvider;
  if (process.env.TTS_PROVIDER?.trim().toLowerCase() !== 'openai') throw new Error('TTS_NOT_CONFIGURED');
  return new OpenAiTtsProvider();
};
export const setTtsProviderForTests = (provider?: TtsProvider): void => { testProvider = provider; };
