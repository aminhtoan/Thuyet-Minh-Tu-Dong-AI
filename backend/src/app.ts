import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { apiRouter } from './routes/index.js';
import { AppError } from './utils/app-error.js';

export function createApp(routes = apiRouter) {
if (routes !== apiRouter && process.env.NODE_ENV !== 'test') throw new Error('TEST_ROUTER_INJECTION_REQUIRES_TEST_ENV');
const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
function isAllowedDevOrigin(origin: string): boolean {
  if (origin.startsWith('exp://')) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (/(?:^|\.)ngrok(?:-free)?\.(?:app|dev|io)$/i.test(host)) return true;
    if (/^(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+|127\.0\.0\.1|localhost)$/.test(host)) return true;
  } catch {
    return false;
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        env.corsOrigins.includes(origin) ||
        (env.nodeEnv === 'development' && isAllowedDevOrigin(origin))
      ) {
        callback(null, true);
        return;
      }
      callback(new AppError(403, 'CORS_ORIGIN_DENIED', 'Nguồn gửi yêu cầu không được phép.'));
    },
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api', routes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
return app;
}
export const app = createApp();
