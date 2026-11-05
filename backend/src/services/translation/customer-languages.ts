import { AppError } from '../../utils/app-error.js';
import { SOURCE_LANGUAGES } from '../source-language-contract.js';

export const CUSTOMER_TRANSLATION_TARGETS = ['en', 'ja', 'ko', 'zh'] as const;
export function assertCustomerTarget(target: string): void {
  if (!(CUSTOMER_TRANSLATION_TARGETS as readonly string[]).includes(target)) throw new AppError(400, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED', 'Ngôn ngữ đích phải là en, ja, ko hoặc zh.');
}
export function assertSimpleLanguages(source: string, target: string): void {
  assertCustomerTarget(target);
  if (!(SOURCE_LANGUAGES as readonly string[]).includes(source)) throw new AppError(400, 'TRANSLATION_SOURCE_NOT_SUPPORTED', 'Ngôn ngữ nguồn chưa được hỗ trợ.');
  if (source === target) throw new AppError(400, 'SAME_SOURCE_TARGET_LANGUAGE', 'Ngôn ngữ đích phải khác ngôn ngữ nguồn.');
}
export function assertCustomerLanguages(source: string, target: string, method: string): void {
  assertSimpleLanguages(source, target);
  // Multilingual expansion is SIMPLE only. Do not silently broaden the older
  // GROUPS_V1 execution/prompt contract or controlled provider paths.
  if (method !== 'GEMINI_SIMPLE_V1' && (source !== 'vi' || target !== 'en')) throw new AppError(400, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED', 'Dịch đa ngôn ngữ yêu cầu Customer SIMPLE V1.');
}
