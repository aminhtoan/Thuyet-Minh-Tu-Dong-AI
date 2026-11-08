import mongoose from 'mongoose';
import { staging } from './env.js';

// server imports this module before app/models, so initialization cannot queue
// automatic collection/index creation before staging policy is installed.
if (staging) {
  mongoose.set('autoCreate', false);
  mongoose.set('autoIndex', false);
}

export const connectDatabase = async (uri: string): Promise<void> => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000,
    ...(staging ? { dbName: staging.database, autoCreate: false, autoIndex: false } : {}) });
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export const getDatabaseState = (): string => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] ?? 'unknown';
};
