import { z } from 'zod';
import { PROJECT_STATUSES } from '../constants/project.constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID dự án không hợp lệ.');
const languageCode = z.string().trim().toLowerCase().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i).max(20);
const editableFields = {
  name: z.string().trim().min(1, 'Tên dự án là bắt buộc.').max(150),
  description: z.string().trim().max(1000).optional().default(''),
  sourceLanguage: languageCode,
};

export const createProjectSchema = z.object({ body: z.object(editableFields).strict() });
export const updateProjectSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    name: editableFields.name.optional(),
    description: z.string().trim().max(1000).optional(),
    sourceLanguage: languageCode.optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, 'Cần ít nhất một trường để cập nhật.'),
});
export const projectIdSchema = z.object({ params: z.object({ id: objectId }) });
export const listProjectsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(150).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});
