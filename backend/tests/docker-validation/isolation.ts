import { existsSync, readFileSync } from 'node:fs';
import mongoose from 'mongoose';

export const database = 'multilingual_ai_narration_groups_test';
export const uri = 'mongodb://narration-groups-test-mongodb:27029/multilingual_ai_narration_groups_test?replicaSet=narration-test-rs&directConnection=true';
export function containerMemory() {
  const v2 = existsSync('/sys/fs/cgroup/memory.max');
  const read = (file: string) => readFileSync(v2 ? `/sys/fs/cgroup/${file}` : `/sys/fs/cgroup/memory/${file}`, 'utf8').trim();
  return v2 ? { version: 2, limit: Number(read('memory.max')), current: Number(read('memory.current')), peak: Number(read('memory.peak')), events: read('memory.events'), failures: 0 }
    : { version: 1, limit: Number(read('memory.limit_in_bytes')), current: Number(read('memory.usage_in_bytes')), peak: Number(read('memory.max_usage_in_bytes')), events: read('memory.oom_control'), failures: Number(read('memory.failcnt')) };
}
export async function verifyContainerDatabase() {
  if (process.env.NODE_ENV !== 'test' || process.env.VALIDATION_ONLY !== 'true' || process.env.HOSTNAME !== 'narration-backend-validation' || existsSync('/app/.env') || process.env.TEST_MONGODB_URI !== uri || process.env.TEST_DATABASE_NAME !== database || !/^[a-f\d]{24}$/i.test(process.env.EXPECTED_MONGO_PROCESS_ID ?? '')) throw new Error('DOCKER_ISOLATION_BLOCKED');
  if (containerMemory().limit !== 512 * 1024 * 1024) throw new Error('CONTAINER_MEMORY_LIMIT_BLOCKED');
  mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
  await mongoose.connect(uri, { dbName: database, autoCreate: false, autoIndex: false, maxPoolSize: 4, serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db!;
  const h = await db.admin().command({ hello: 1 });
  if (db.databaseName !== database || h.setName !== 'narration-test-rs' || !h.isWritablePrimary || h.hosts?.length !== 1 || h.hosts[0] !== 'localhost:27029' || h.topologyVersion?.processId?.toString() !== process.env.EXPECTED_MONGO_PROCESS_ID) { await mongoose.disconnect(); throw new Error('DOCKER_DATABASE_IDENTITY_BLOCKED'); }
  return db;
}
