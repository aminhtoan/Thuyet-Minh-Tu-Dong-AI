import { AppError } from '../utils/app-error.js';

export type CustomerTranslationQuota = Readonly<{ perUser: number; global: number }>;
// Finite defaults for normal Customer use, not the former trial 3/20 profile.
export const DEFAULT_CUSTOMER_TRANSLATION_QUOTA: CustomerTranslationQuota = Object.freeze({ perUser: 20, global: 200 });
const limit = (raw: string | undefined, fallback: number, ceiling: number) => {
  if (raw === undefined) return fallback;
  const value = raw.trim();
  if (!/^[1-9]\d{0,4}$/.test(value) || Number(value) > ceiling) {
    throw new AppError(503, 'CUSTOMER_TRANSLATION_QUOTA_INVALID', 'Cấu hình hạn mức dịch không hợp lệ. Chưa gửi yêu cầu AI.');
  }
  return Number(value);
};
export function customerTranslationQuota(environment: Record<string, string | undefined> = process.env): CustomerTranslationQuota {
  return Object.freeze({
    perUser: limit(environment.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT, DEFAULT_CUSTOMER_TRANSLATION_QUOTA.perUser, 1000),
    global: limit(environment.CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT, DEFAULT_CUSTOMER_TRANSLATION_QUOTA.global, 10000),
  });
}
