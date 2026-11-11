import { trackedObject } from '../../maintenance/runtime.js';
import type { TranslationProvider } from './translation-provider.interface.js';
import { OpenAiTranslationProvider } from './openai-translation.provider.js';
import { GeminiTranslationProvider } from './gemini-translation.provider.js';

let testProvider: TranslationProvider | undefined;

export const getTranslationProvider = (): TranslationProvider => {
  if (testProvider) return trackedObject(testProvider, 'providerCalls');
  const provider = process.env.TRANSLATION_PROVIDER?.trim().toLowerCase() || 'gemini';
  if (provider === 'gemini') return trackedObject(new GeminiTranslationProvider(), 'providerCalls');
  if (provider !== 'openai') throw new Error('TRANSLATION_NOT_CONFIGURED');
  return trackedObject(new OpenAiTranslationProvider(), 'providerCalls');
};

export const setTranslationProviderForTests = (provider?: TranslationProvider): void => { testProvider = provider; };
