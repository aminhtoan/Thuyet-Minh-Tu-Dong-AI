import type { RequestHandler } from 'express';
import * as service from '../services/admin.service.js';
import { successResponse } from '../utils/api-response.js';

const query = <T>(request: Parameters<RequestHandler>[0]) => request.validated?.query as T;
const id = (request: Parameters<RequestHandler>[0]) => String(request.params.id ?? '');
export const dashboard: RequestHandler = async (_request, response) => response.json(successResponse(await service.dashboard()));
export const users: RequestHandler = async (request, response) => response.json(successResponse(await service.listUsers(query<Parameters<typeof service.listUsers>[0]>(request))));
export const user: RequestHandler = async (request, response) => response.json(successResponse({ user: await service.getUser(id(request)) }));
export const updateUserStatus: RequestHandler = async (request, response) => response.json(successResponse({ user: await service.updateUserStatus(id(request), (request.body as { status: 'ACTIVE'|'BLOCKED' }).status, request.user?.id ?? '') }));
export const projects: RequestHandler = async (request, response) => response.json(successResponse(await service.listProjects(query<Parameters<typeof service.listProjects>[0]>(request))));
export const project: RequestHandler = async (request, response) => response.json(successResponse(await service.getProject(id(request))));
export const jobs: RequestHandler = async (request, response) => response.json(successResponse(await service.listJobs(query<Parameters<typeof service.listJobs>[0]>(request))));
export const job: RequestHandler = async (request, response) => response.json(successResponse({ job: await service.getJob(id(request)) }));
export const languages: RequestHandler = async (request, response) => response.json(successResponse({ languages: await service.listLanguages(query<Parameters<typeof service.listLanguages>[0]>(request)) }));
export const voices: RequestHandler = async (request, response) => response.json(successResponse({ voices: await service.listVoices(query<Parameters<typeof service.listVoices>[0]>(request)) }));
export const logs: RequestHandler = async (request, response) => response.json(successResponse(await service.listLogs(query<Parameters<typeof service.listLogs>[0]>(request))));
export const visitQr: RequestHandler = async (request, response) => response.json(successResponse(await service.listVisitQr(query<Parameters<typeof service.listVisitQr>[0]>(request))));
export const settings: RequestHandler = (_request, response) => response.json(successResponse({ settings: service.getSettings() }));

