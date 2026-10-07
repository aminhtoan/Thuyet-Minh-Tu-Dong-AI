import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { apiRouter } from './routes/index.js';
import { AppError } from './utils/app-error.js';

export const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError(403, 'CORS_ORIGIN_DENIED', 'Nguồn gửi yêu cầu không được phép.'));
    },
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api', apiRouter);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
