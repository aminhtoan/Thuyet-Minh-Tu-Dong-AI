import { Router } from 'express';
import * as controller from '../controllers/voice-catalog.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { listVoicesSchema } from '../validators/catalog.validator.js';

export const voiceRouter = Router();
voiceRouter.get('/', authenticate, authorize('CUSTOMER'), validate(listVoicesSchema), controller.list);
