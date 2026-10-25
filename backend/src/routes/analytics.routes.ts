import { Router } from 'express';
import * as controller from '../controllers/analytics.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { trackListenSchema } from '../validators/analytics.validator.js';

export const analyticsRouter = Router();

analyticsRouter.post('/listen', validate(trackListenSchema), controller.trackListen);
analyticsRouter.get('/listen-stats', controller.getListenStats);
