import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const requireValue = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`);
  }
  return value;
};

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? '8080');
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT phải là số nguyên từ 1 đến 65535.');
  }
  return port;
};

const parseOrigins = (value: string | undefined): string[] =>
  (value ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV phải là development, test hoặc production.');
}

export const env = Object.freeze({
  port: parsePort(process.env.PORT),
  nodeEnv,
  mongoUri: requireValue('MONGODB_URI'),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  uploadDir: process.env.UPLOAD_DIR?.trim() || 'uploads',
});
