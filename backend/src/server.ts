import type { Server } from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

let server: Server | undefined;
let shuttingDown = false;

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Nhận ${signal}, đang dừng máy chủ...`);

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await disconnectDatabase();
};

const start = async (): Promise<void> => {
  try {
    await connectDatabase(env.mongoUri);
    console.info('Đã kết nối MongoDB.');
    server = app.listen(env.port, () => {
      console.info(`Backend đang chạy tại http://localhost:${env.port}/api (${env.nodeEnv}).`);
    });
  } catch (error) {
    console.error('Không thể khởi động backend:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal)
      .catch((error: unknown) => console.error('Lỗi khi dừng máy chủ:', error))
      .finally(() => {
        process.exitCode = 0;
      });
  });
}

void start();
