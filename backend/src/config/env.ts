import dotenv from 'dotenv';
import { stagingConfig } from './staging.js';

// A staging process receives its reviewed environment externally, never from
// the developer's implicit .env file.
if (process.env.APP_ENV !== 'staging') dotenv.config({ quiet: true });
export const staging = stagingConfig(process.env);

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

const parsePositiveNumber = (name: string, value: string | undefined, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} phải là số dương.`);
  return parsed;
};

const parseOrigins = (value: string | undefined): string[] =>
  (value ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const accessSecret = requireValue('JWT_ACCESS_SECRET');
const refreshSecret = requireValue('JWT_REFRESH_SECRET');
if (accessSecret === refreshSecret) {
  throw new Error('JWT_ACCESS_SECRET và JWT_REFRESH_SECRET phải khác nhau.');
}

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
  maxUploadSizeMb: parsePositiveNumber('MAX_UPLOAD_SIZE_MB', process.env.MAX_UPLOAD_SIZE_MB, 200),
  jwtAccessSecret: accessSecret,
  jwtAccessExpiresIn: requireValue('JWT_ACCESS_EXPIRES_IN'),
  jwtRefreshSecret: refreshSecret,
  jwtRefreshExpiresIn: requireValue('JWT_REFRESH_EXPIRES_IN'),
});
