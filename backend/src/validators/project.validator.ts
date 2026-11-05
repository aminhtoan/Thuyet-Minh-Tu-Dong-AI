import { z } from 'zod';
import { PROJECT_STATUSES } from '../constants/project.constants.js';
import { SOURCE_LANGUAGES, SOURCE_LANGUAGE_MODES } from '../services/source-language-contract.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID dự án không hợp lệ.');
const languageCode = z.string().trim().toLowerCase().pipe(z.enum(SOURCE_LANGUAGES));
const editableFields = {
  name: z.string().trim().min(1, 'Tên dự án là bắt buộc.').max(150),
  description: z.string().trim().max(1000).optional().default(''),
  sourceLanguage: languageCode.nullable().optional(),
  sourceLanguageMode: z.enum(SOURCE_LANGUAGE_MODES).optional(),
};

export const createProjectSchema = z.object({ body: z.object(editableFields).strict().superRefine((body, ctx) => {
  const mode = body.sourceLanguageMode ?? (body.sourceLanguage ? 'MANUAL' : 'AUTO');
  if (mode === 'MANUAL' && !body.sourceLanguage) ctx.addIssue({ code: 'custom', path: ['sourceLanguage'], message: 'MANUAL requires sourceLanguage.' });
  if (mode === 'AUTO' && body.sourceLanguage) ctx.addIssue({ code: 'custom', path: ['sourceLanguage'], message: 'AUTO must not supply a source language hint.' });
}) });
export const updateProjectSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    name: editableFields.name.optional(),
    description: z.string().trim().max(1000).optional(),
    sourceLanguage: languageCode.optional(),
    sourceLanguageMode: z.enum(SOURCE_LANGUAGE_MODES).optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, 'Cần ít nhất một trường để cập nhật.'),
});
export const confirmSourceLanguageSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ sourceLanguage: languageCode, expectedRevision: z.number().int().min(1) }).strict(),
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
