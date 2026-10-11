import { Router, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { errorResponse } from '../utils/api-response.js';
import { loginSchema, refreshTokenSchema, registerSchema, profileNameSchema } from '../validators/auth.validator.js';

const authRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(_request, response) {
    response.status(429).json(errorResponse('RATE_LIMIT_EXCEEDED', 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'));
  },
});

export const authRouter = Router();
authRouter.post('/register', authRateLimiter, validate(registerSchema), authController.register);
authRouter.post('/login', authRateLimiter, validate(loginSchema), authController.login);
authRouter.post('/refresh', authRateLimiter, validate(refreshTokenSchema), authController.refresh);
authRouter.post('/logout', validate(refreshTokenSchema), authController.logout);
authRouter.get('/me', authenticate, authController.me);
authRouter.patch('/me', authenticate, validate(profileNameSchema), authController.updateMe);
