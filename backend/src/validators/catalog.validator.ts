import { z } from 'zod';

const languageCode = z.string().trim().toLowerCase().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i).max(20);

export const listVoicesSchema = z.object({
  query: z.object({ language: languageCode.optional() }).strict(),
});
