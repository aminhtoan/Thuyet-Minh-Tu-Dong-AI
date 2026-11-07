const isTestFixture = (lang) => {
  const code = (lang?.code || '').toLowerCase().trim();
  const name = (lang?.name || '').trim();
  return code.startsWith('xx-') || /^[a-z]{2}-[a-f0-9]{6,8}$/i.test(code) || /^s2[0-9]\s/i.test(name) || /^test\s/i.test(name);
};

export function translationTargetChoices(languages, sourceLanguage) {
  if (!Array.isArray(languages)) throw new Error('Không thể đọc danh sách ngôn ngữ từ máy chủ.');
  const source = sourceLanguage.trim().toLowerCase();
  const choices = new Map();
  for (const language of languages) {
    if (typeof language?.code !== 'string' || isTestFixture(language)) continue;
    const code = language.code.trim().toLowerCase();
    if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(code) || code === source) continue;
    choices.set(code, { ...language, code });
  }
  return [...choices.values()];
}

// Native names for supported languages (shown alongside Vietnamese name)
const NATIVE_NAMES = {
  vi: 'Tiếng Việt',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  zh: '中文（简体）',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  nl: 'Nederlands',
  pl: 'Polski',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  hi: 'हिन्दी',
  ar: 'العربية',
  tr: 'Türkçe',
};

export function translationLanguageLabel(language) {
  const code = (language.code ?? '').toLowerCase();
  let viName;
  if (code === 'zh') {
    viName = 'Tiếng Trung (giản thể)';
  } else {
    try {
      const dn = new Intl.DisplayNames(['vi'], { type: 'language', fallback: 'none' }).of(code);
      if (dn) viName = dn.charAt(0).toUpperCase() + dn.slice(1);
    } catch { /* Use the actual catalog label when locale data is unavailable. */ }
  }
  if (!viName) viName = language.name || code;

  const native = NATIVE_NAMES[code] || language.nativeName || null;
  // Don't repeat if native and viName are the same (e.g. "Tiếng Việt · Tiếng Việt")
  if (native && native.toLowerCase() !== viName.toLowerCase()) {
    return `${viName} · ${native}`;
  }
  return viName;
}
