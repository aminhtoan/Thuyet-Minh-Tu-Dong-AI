import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import {
  CUSTOMER_SOFT_DELETE_ALLOWLIST,
  executeApprovedCustomerSoftDelete,
  inspectCustomerCleanupCandidate,
  validateCleanupAllowlist,
  validateCleanupSnapshot,
} from '../services/customer-soft-delete.service.js';

const EXPECTED_DATABASE = 'multilingual_ai_narration';
const fingerprint = (uri: string) => {
  const parsed = new URL(uri);
  return createHash('sha256').update(`${parsed.protocol}//${parsed.host}/${parsed.pathname.replace(/^\//, '')}`).digest('hex').slice(0, 16);
};

async function run() {
  const mode = process.argv[2] ?? 'dry-run';
  if (!['dry-run', 'execute'].includes(mode)) throw new Error('CUSTOMER_CLEANUP_MODE_INVALID');
  validateCleanupAllowlist(CUSTOMER_SOFT_DELETE_ALLOWLIST);
  await mongoose.connect(env.mongoUri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 5_000 });
  const database = mongoose.connection.db;
  if (!database || database.databaseName !== EXPECTED_DATABASE) throw new Error('CUSTOMER_CLEANUP_DATABASE_MISMATCH');
  const hello = await database.admin().command({ hello: 1 }) as { setName?: string; logicalSessionTimeoutMinutes?: number };
  const deploymentFingerprint = fingerprint(env.mongoUri);
  const snapshots = [];
  for (const candidate of CUSTOMER_SOFT_DELETE_ALLOWLIST) {
    const snapshot = await inspectCustomerCleanupCandidate(candidate);
    validateCleanupSnapshot(snapshot);
    snapshots.push(snapshot);
  }
  console.info(JSON.stringify({
    mode,
    environment: env.nodeEnv,
    database: database.databaseName,
    deploymentFingerprint,
    replicaSet: hello.setName ?? null,
    transactionCapable: Boolean(hello.setName && hello.logicalSessionTimeoutMinutes),
    productionIsolation: process.env.CUSTOMER_CLEANUP_DEPLOYMENT_CLASSIFICATION === 'NON_PRODUCTION_ISOLATED' ? 'VERIFIED_BY_OPERATOR_INPUT' : 'UNKNOWN',
    candidates: snapshots.map((snapshot) => ({
      id: snapshot.candidate.id,
      ready: true,
      activityLogs: snapshot.activityLogs,
      historicalProjectIds: snapshot.historicalProjectIds,
      dependencies: snapshot.dependencies,
    })),
    databaseWrites: mode === 'dry-run' ? 0 : 'NOT_STARTED',
  }, null, 2));
  if (mode === 'dry-run') return;
  if (env.nodeEnv === 'production') throw new Error('CUSTOMER_CLEANUP_PRODUCTION_FORBIDDEN');
  if (!hello.setName || !hello.logicalSessionTimeoutMinutes) throw new Error('CUSTOMER_CLEANUP_TRANSACTION_UNAVAILABLE');
  if (process.env.CUSTOMER_CLEANUP_DEPLOYMENT_CLASSIFICATION !== 'NON_PRODUCTION_ISOLATED') throw new Error('CUSTOMER_CLEANUP_ISOLATION_UNVERIFIED');
  if (process.env.CUSTOMER_CLEANUP_DEPLOYMENT_FINGERPRINT !== deploymentFingerprint) throw new Error('CUSTOMER_CLEANUP_DEPLOYMENT_FINGERPRINT_MISMATCH');
  if (!/^[a-f0-9]{64}$/.test(process.env.CUSTOMER_CLEANUP_BACKUP_SHA256 ?? '')) throw new Error('CUSTOMER_CLEANUP_BACKUP_UNVERIFIED');
  const deletedBy = process.env.CUSTOMER_CLEANUP_ADMIN_ID ?? '';
  const deleted = await executeApprovedCustomerSoftDelete({
    deletedBy,
    deletedReason: 'S24_DISPOSABLE_CUSTOMER_CLEANUP',
    maintenanceFence: process.env.CUSTOMER_CLEANUP_MAINTENANCE_CONFIRMED as 'ADMIN07.3_MAINTENANCE_CONFIRMED',
  });
  console.info(`Soft-delete completed for ${deleted.length} approved test accounts.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  void run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'CUSTOMER_CLEANUP_FAILED');
    process.exitCode = 1;
  }).finally(() => mongoose.disconnect());
}
