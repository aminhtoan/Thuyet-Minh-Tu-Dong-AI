export const customerTranslationTargets = ['en', 'ja', 'ko', 'zh'];
export function customerTargetLabel(target) {
  return { en: 'tiếng Anh', ja: 'tiếng Nhật', ko: 'tiếng Hàn', zh: 'tiếng Trung (giản thể)' }[target] ?? 'ngôn ngữ đã chọn';
}
export function customerTargetChoices(languages, source) {
  return languages.filter(language => customerTranslationTargets.includes(language.code) && language.code !== source);
}
