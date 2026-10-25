import type { RequestHandler } from 'express';
import * as projectService from '../services/project.service.js';
import { successResponse } from '../utils/api-response.js';

const userId = (request: Parameters<RequestHandler>[0]) => request.user?.id ?? '';
const projectId = (request: Parameters<RequestHandler>[0]) => String(request.params.id ?? '');
export const create: RequestHandler = async (request, response) => response.status(201).json(successResponse({ project: await projectService.create(userId(request), request.body) }));
export const list: RequestHandler = async (request, response) => response.json(successResponse(await projectService.list(userId(request), request.validated?.query as Parameters<typeof projectService.list>[1])));
export const get: RequestHandler = async (request, response) => response.json(successResponse({ project: await projectService.get(projectId(request), userId(request)) }));
export const update: RequestHandler = async (request, response) => response.json(successResponse({ project: await projectService.update(projectId(request), userId(request), request.body) }));
export const remove: RequestHandler = async (request, response) => { await projectService.remove(projectId(request), userId(request)); response.json(successResponse({ message: 'Đã xóa dự án.' })); };
export const branchLanguage: RequestHandler = async (request, response) => {
  const { targetLanguage } = request.body as { targetLanguage: string };
  const result = await projectService.branchLanguage(projectId(request), userId(request), targetLanguage);
  response.status(201).json(successResponse(result));
};
export const languageVariants: RequestHandler = async (request, response) => {
  const currentLanguage = typeof request.query.language === 'string' ? request.query.language : undefined;
  const variants = await projectService.getLanguageVariants(projectId(request), userId(request), currentLanguage);
  response.json(successResponse({ variants }));
};
