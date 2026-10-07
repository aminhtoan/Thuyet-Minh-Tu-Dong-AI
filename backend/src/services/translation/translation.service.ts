import type { TranslationProvider } from './translation-provider.interface.js';
import { OpenAiTranslationProvider } from './openai-translation.provider.js';

let testProvider: TranslationProvider | undefined;

export const getTranslationProvider = (): TranslationProvider => {
  if (testProvider) return testProvider;
  const provider = process.env.TRANSLATION_PROVIDER?.trim().toLowerCase();
  if (provider !== 'openai') throw new Error('TRANSLATION_NOT_CONFIGURED');
  return new OpenAiTranslationProvider();
};

export const setTranslationProviderForTests = (provider?: TranslationProvider): void => { testProvider = provider; };
