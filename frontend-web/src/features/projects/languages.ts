import type { LanguageCode } from './types';

export const languages: readonly { code: LanguageCode; name: string; nativeName: string }[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

export function filterTargetLanguages(source: LanguageCode) {
  return languages.filter((language) => language.code !== source);
}

export function isLanguageCode(value: string): value is LanguageCode {
  return languages.some((language) => language.code === value);
}
