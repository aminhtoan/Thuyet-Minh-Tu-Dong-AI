import type { LanguageCode } from './types';

export const languages: readonly { code: LanguageCode; name: string; nativeName: string }[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
];

export function filterTargetLanguages(source: LanguageCode) {
  return languages.filter((language) => language.code.toLowerCase() !== source.toLowerCase());
}

export function isLanguageCode(value: string): value is LanguageCode {
  return typeof value === 'string' && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(value.trim());
}

export function languageDisplayName(value: LanguageCode): string {
  const configured = languages.find((language) => language.code.toLowerCase() === value.toLowerCase())?.nativeName;
  try {
    const localized = new Intl.DisplayNames(['vi'], { type: 'language', fallback: 'none' }).of(value);
    if (localized) return localized.charAt(0).toUpperCase() + localized.slice(1);
  } catch { /* Fall back to the existing source-language catalog. */ }
  return configured || value.toUpperCase();
}
