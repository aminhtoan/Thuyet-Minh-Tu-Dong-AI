import { Language } from '../models/Language.js';
import { Voice } from '../models/Voice.js';

const isTestFixture = (lang: { code: string; name?: string }) =>
  lang.code.startsWith('xx-') ||
  /^[a-z]{2}-[a-f0-9]{6,8}$/i.test(lang.code) ||
  /^s2[0-9]\s/i.test(lang.name || '') ||
  /^test\s/i.test(lang.name || '');

export const listActiveVoices = async (languageCode?: string) => {
  const languageFilter: Record<string, unknown> = { isActive: true };
  if (languageCode) languageFilter.code = languageCode;
  const rawLanguages = await Language.find(languageFilter).sort({ code: 1 });
  const languages = rawLanguages.filter((l) => !isTestFixture(l));
  const languageIds = languages.map((language) => language._id);
  const configuredProvider = process.env.TTS_PROVIDER?.trim().toLowerCase();
  const voiceFilter: Record<string, unknown> = { languageId: { $in: languageIds }, isActive: true };
  if (configuredProvider) voiceFilter.provider = configuredProvider;
  const voices = await Voice.find(voiceFilter).sort({ languageId: 1, name: 1 });
  const byId = new Map(languages.map((language) => [language._id.toString(), language]));
  return {
    languages: languages.map((language) => ({ id: language._id.toString(), code: language.code, name: language.name, nativeName: language.nativeName })),
    voices: voices.map((voice) => {
      const language = byId.get(voice.languageId.toString());
      return { id: voice._id.toString(), language: language ? { id: language._id.toString(), code: language.code, name: language.name, nativeName: language.nativeName } : null,
        provider: voice.provider, name: voice.name, gender: voice.gender, description: voice.description, previewUrl: voice.previewUrl ?? null };
    }),
  };
};
