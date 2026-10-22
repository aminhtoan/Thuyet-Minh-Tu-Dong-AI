import { AppError } from '../utils/app-error.js';
export type CustomerTranslationMethod = 'GROUPS_V1' | 'GEMINI_SIMPLE_V1';
export function customerTranslationMethod(): CustomerTranslationMethod {
  const method = process.env.CUSTOMER_TRANSLATION_METHOD ?? 'GROUPS_V1';
  if (method !== 'GROUPS_V1' && method !== 'GEMINI_SIMPLE_V1') throw new AppError(503, 'TRANSLATION_NOT_CONFIGURED', 'Phương thức dịch chưa được cấu hình hợp lệ.');
  return method;
}
