import type { LanguageCode } from './types';

export const languages: readonly { code: LanguageCode; name: string; nativeName: string }[] = [
  { code: 'vi', name: 'Tiếng Việt', nativeName: 'Tiếng Việt' },
  { code: 'en', name: 'Tiếng Anh', nativeName: 'English' },
  { code: 'ja', name: 'Tiếng Nhật', nativeName: '日本語' },
  { code: 'ko', name: 'Tiếng Hàn', nativeName: '한국어' },
];

export function filterTargetLanguages(source: LanguageCode) {
  return languages.filter((language) => language.code !== source);
}

export function isLanguageCode(value: string): value is LanguageCode {
  return languages.some((language) => language.code === value);
}
