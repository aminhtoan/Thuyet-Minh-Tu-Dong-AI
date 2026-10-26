import { Router } from 'express';
import * as controller from '../controllers/analytics.controller.js';

export const qrRouter = Router();

qrRouter.get('/visit', controller.redirectVisitQR);
qrRouter.post('/track', controller.trackVisitQR);
