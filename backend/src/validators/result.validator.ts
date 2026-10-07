import { z } from 'zod';
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ.');
export const processMediaSchema = z.object({ body: z.object({ narrationId: objectId }).strict() });
export const resultIdSchema = z.object({ params: z.object({ id: objectId, resultId: objectId }) });
