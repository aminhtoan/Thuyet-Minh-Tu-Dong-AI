import { z } from 'zod';
import { PROCESSING_JOB_STATUSES, PROCESSING_JOB_TYPES } from '../constants/processing-job.constants.js';
import { MEDIA_TYPES, PROJECT_STATUSES } from '../constants/project.constants.js';
import { USER_STATUSES } from '../constants/user.constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ.');
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(10);
const search = z.string().trim().max(150).optional();
const language = z.string().trim().toLowerCase().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i).max(20).optional();

export const adminIdSchema = z.object({ params: z.object({ id: objectId }).strict() });
export const adminUsersSchema = z.object({ query: z.object({ page, limit, search, status: z.enum(USER_STATUSES).optional(), sort: z.enum(['NEWEST', 'OLDEST', 'NAME_ASC', 'NAME_DESC']).default('NEWEST') }).strict() });
export const adminUserStatusSchema = z.object({ params: z.object({ id: objectId }).strict(), body: z.object({ status: z.enum(USER_STATUSES) }).strict() });
export const adminProjectsSchema = z.object({ query: z.object({ page, limit, search, status: z.enum(PROJECT_STATUSES).optional(), language, mediaType: z.enum(MEDIA_TYPES).optional() }).strict() });
export const adminJobsSchema = z.object({ query: z.object({ page, limit, search, type: z.enum(PROCESSING_JOB_TYPES).optional(), status: z.enum(PROCESSING_JOB_STATUSES).optional() }).strict() });
export const adminLanguagesSchema = z.object({ query: z.object({ search, isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional() }).strict() });
export const adminVoicesSchema = z.object({ query: z.object({ language, languageId: objectId.optional(), provider: z.string().trim().max(80).optional(), isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional() }).strict() });
export const adminLogsSchema = z.object({ query: z.object({ page, limit, search, role: z.enum(['CUSTOMER', 'ADMIN']).optional(), entityType: z.string().trim().max(80).optional(), action: z.string().trim().max(100).optional(), days: z.coerce.number().int().min(1).max(3650).optional() }).strict() });
export const adminVisitQrSchema = z.object({ query: z.object({ page, limit, search, source: z.string().trim().max(100).optional(), os: z.string().trim().max(50).optional(), deviceType: z.string().trim().max(50).optional(), startDate: z.string().trim().optional(), endDate: z.string().trim().optional() }).strict() });

