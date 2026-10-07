import { z } from 'zod';

const languageCode = z.string().trim().toLowerCase().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i, 'Ngôn ngữ đích không hợp lệ.').max(20);

export const startTranslationSchema = z.object({ body: z.object({ targetLanguage: languageCode }).strict() });
export const targetTranslationSchema = z.object({ params: z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'ID dự án không hợp lệ.'),
  targetLanguage: languageCode,
}) });
