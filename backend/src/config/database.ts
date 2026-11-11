import mongoose from 'mongoose';
import { drainRuntime } from '../maintenance/runtime.js';

export const connectDatabase = async (uri: string): Promise<void> => {
  await drainRuntime.track('activeOperations',()=>mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 }));
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await drainRuntime.track('activeOperations',()=>mongoose.disconnect());
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
