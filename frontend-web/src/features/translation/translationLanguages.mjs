export function translationTargetChoices(languages, sourceLanguage) {
  if (!Array.isArray(languages)) throw new Error('Không thể đọc danh sách ngôn ngữ từ máy chủ.');
  const source = sourceLanguage.trim().toLowerCase();
  const choices = new Map();
  for (const language of languages) {
    if (typeof language?.code !== 'string') continue;
    const code = language.code.trim().toLowerCase();
    if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(code) || code === source) continue;
    choices.set(code, { ...language, code });
  }
  return [...choices.values()];
}
export function translationLanguageLabel(language) {
  try {
    const label = new Intl.DisplayNames(['vi'], { type: 'language', fallback: 'none' }).of(language.code);
    if (label) return label.charAt(0).toUpperCase() + label.slice(1);
  } catch { /* Use the actual catalog label when locale data is unavailable. */ }
  return language.nativeName || language.name || language.code;
}
