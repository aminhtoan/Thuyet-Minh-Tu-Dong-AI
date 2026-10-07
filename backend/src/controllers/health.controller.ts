import type { RequestHandler } from 'express';
import { getDatabaseState } from '../config/database.js';
import { successResponse } from '../utils/api-response.js';

export const getHealth: RequestHandler = (_request, response) => {
  const database = getDatabaseState();
  const healthy = database === 'connected';

  response.status(healthy ? 200 : 503).json(
    successResponse({
      status: healthy ? 'ok' : 'degraded',
      service: 'multilingual-ai-narration-backend',
      database,
      timestamp: new Date().toISOString(),
    }),
  );
};
