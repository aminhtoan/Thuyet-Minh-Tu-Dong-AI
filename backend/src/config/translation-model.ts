import { AppError } from '../utils/app-error.js';

// Operator selection BEFORE a new attempt, never an error-triggered fallback.
// Controlled execution and legacy routes retain their existing model binding.
export function customerTranslationModel(env: NodeJS.ProcessEnv = process.env) {
  const primary = env.GEMINI_TRANSLATION_MODEL?.trim() || 'gemini-3.8-flash';
  const fallback = env.GEMINI_TRANSLATION_FALLBACK_MODEL === undefined ? 'gemini-3.6-flash' : env.GEMINI_TRANSLATION_FALLBACK_MODEL.trim();
  const selection = env.CUSTOMER_TRANSLATION_MODEL_SELECTION ?? 'PRIMARY';
  const valid = (model: string) => /^gemini-[a-z0-9.-]+$/.test(model) && !/transcribe|tts|live|image/i.test(model);
  if (!['PRIMARY', 'FALLBACK'].includes(selection) || !valid(primary) || (fallback !== '' && !valid(fallback)) || (selection === 'FALLBACK' && !fallback)) {
    throw new AppError(503, 'TRANSLATION_NOT_CONFIGURED', 'Cấu hình model dịch không hợp lệ. Chưa gọi Gemini.');
  }
  return Object.freeze({ primary, fallback, selection, model: selection === 'FALLBACK' ? fallback : primary });
}
