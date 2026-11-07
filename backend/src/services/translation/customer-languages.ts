import { AppError } from '../../utils/app-error.js';
import { SOURCE_LANGUAGES } from '../source-language-contract.js';

// Open-ended: accept any language code that the catalog can serve.
// Individual providers (Gemini) handle per-language capability at call time.
export const CUSTOMER_TRANSLATION_TARGETS = ['vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'nl', 'pl', 'th', 'id', 'ms', 'hi', 'ar', 'tr'] as const;
export type CustomerTranslationTarget = typeof CUSTOMER_TRANSLATION_TARGETS[number];

/** Accept any BCP-47-like code (2–10 chars, letters/digits/hyphens), not equal to source. */
export function assertCustomerTarget(target: string): void {
  if (typeof target !== 'string' || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(target)) {
    throw new AppError(400, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED', 'Mã ngôn ngữ không hợp lệ.');
  }
}

export function assertSimpleLanguages(source: string, target: string): void {
  assertCustomerTarget(target);
  if (!(SOURCE_LANGUAGES as readonly string[]).includes(source)) throw new AppError(400, 'TRANSLATION_SOURCE_NOT_SUPPORTED', 'Ngôn ngữ nguồn chưa được hỗ trợ.');
  if (source.toLowerCase() === target.toLowerCase()) throw new AppError(400, 'SAME_SOURCE_TARGET_LANGUAGE', 'Ngôn ngữ đích phải khác ngôn ngữ nguồn.');
}

export function assertCustomerLanguages(source: string, target: string, method: string): void {
  assertSimpleLanguages(source, target);
  // Multilingual expansion is SIMPLE only. Do not silently broaden the older
  // GROUPS_V1 execution/prompt contract or controlled provider paths.
  if (method !== 'GEMINI_SIMPLE_V1' && (source !== 'vi' || target !== 'en')) throw new AppError(400, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED', 'Dịch đa ngôn ngữ yêu cầu Customer SIMPLE V1.');
}
