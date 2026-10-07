import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ.');
const languageCode = z.string().trim().toLowerCase().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i, 'Ngôn ngữ đích không hợp lệ.').max(20);

export const startNarrationSchema = z.object({ body: z.object({ targetLanguage: languageCode, voiceId: objectId.optional() }).strict() });
export const narrationIdSchema = z.object({ params: z.object({ id: objectId, narrationId: objectId }) });
