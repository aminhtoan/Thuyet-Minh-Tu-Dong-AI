import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';

const requireSeedValue = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường seed bắt buộc: ${name}`);
  return value;
};

export const seedAdmin = async (): Promise<'created' | 'exists'> => {
  const fullName = requireSeedValue('ADMIN_SEED_NAME');
  const email = requireSeedValue('ADMIN_SEED_EMAIL').toLowerCase();
  const password = requireSeedValue('ADMIN_SEED_PASSWORD');
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'ADMIN') throw new Error('Email seed đang thuộc tài khoản CUSTOMER; không thể tự động nâng quyền.');
    console.info('Admin account already exists.');
    return 'exists';
  }
  await User.create({ fullName, email, passwordHash: await hashPassword(password), role: 'ADMIN', status: 'ACTIVE' });
  console.info('Admin account created successfully.');
  return 'created';
};

const run = async (): Promise<void> => {
  try {
    await connectDatabase(env.mongoUri);
    await seedAdmin();
  } finally {
    await disconnectDatabase();
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  void run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Không thể seed tài khoản Admin.');
    process.exitCode = 1;
  });
}
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
