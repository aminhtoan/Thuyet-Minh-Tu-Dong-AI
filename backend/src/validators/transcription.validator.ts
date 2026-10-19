import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ.');

export const updateTranscriptSegmentSchema = z.object({
  params: z.object({ id: objectId, segmentId: objectId }).strict(),
  body: z.object({
    text: z.string().trim().min(1, 'Nội dung phân đoạn không được để trống.').max(4000, 'Nội dung phân đoạn không được vượt quá 4000 ký tự.'),
    expectedRevision: z.number().int().min(1, 'Revision phải là số nguyên dương.'),
  }).strict(),
});
