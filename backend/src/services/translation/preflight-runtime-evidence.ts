import { createHash, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { TranslationAttempt } from '../../models/TranslationAttempt.js';
import { customerTranslationQuota } from '../../config/customer-translation-quota.js';

// Read the SAME UTC receipts/config as quota reservation. No upsert, session,
// claim, refund or index initialization. Observation is not a capacity reservation.
export async function readCustomerQuota(ownerId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const policy = customerTranslationQuota();
  const ids = [`customer-day:${ownerId}:${day}`, `customer-global-day:${day}`];
  const rows = await TranslationAttempt.collection.find({ _id: { $in: ids } } as never, {
    projection: { _id: 1, kind: 1, count: 1 }, limit: 2, readConcern: { level: 'majority' },
  }).toArray();
  if (new Date().toISOString().slice(0, 10) !== day) throw Error('QUOTA_DAY_CHANGED');
  const counts = ids.map(id => {
    const row = rows.find(row => String(row._id) === id);
    if (!row) return 0;
    if (row.kind !== 'QUOTA' || !Number.isSafeInteger(row.count) || row.count < 0) throw Error('QUOTA_RECORD_INVALID');
    return row.count as number;
  });
  return { status: 'VERIFIED', dayUTC: day, userRemaining: Math.max(0, policy.perUser - counts[0]!), globalRemaining: Math.max(0, policy.global - counts[1]!), userLimit: policy.perUser, globalLimit: policy.global, available: counts[0]! < policy.perUser && counts[1]! < policy.global, reservation: false };
}

const instanceId = randomUUID();
// User-approved DEVELOPMENT target (S26.16/S26.18), not production approval.
export const approvedDevelopmentDatabase = 'multilingual_ai_narration';
export async function readDeploymentIdentity() {
  const connection = mongoose.connection;
  if (connection.readyState !== 1 || !connection.db || TranslationAttempt.db !== connection) throw Error('DEPLOYMENT_UNAVAILABLE');
  const hello = await connection.db.admin().command({ hello: 1 });
  if (!hello.isWritablePrimary || typeof hello.setName !== 'string' || !Array.isArray(hello.hosts) || !hello.hosts.length || !hello.hosts.every((host: unknown) => typeof host === 'string')) throw Error('DEPLOYMENT_UNVERIFIED');
  // Fingerprint actual serving connection, not a second connection from .env.
  // Do not return hosts, replica set, DB name, URI or credentials.
  const fingerprint = createHash('sha256').update(JSON.stringify([connection.db.databaseName, hello.setName, [...hello.hosts].sort()])).digest('hex');
  const approved = process.env.NODE_ENV === 'development' && connection.db.databaseName === approvedDevelopmentDatabase && hello.hosts.every((host: string) => /^[a-z0-9.-]+\.mongodb\.net(?::\d+)?$/i.test(host));
  return { status: 'VERIFIED', fingerprint, instanceId, replicaSet: true, primary: true, intendedTargetApproval: approved ? 'APPROVED_BY_USER' : 'MISMATCH', approvedDatabaseMatch: approved };
}

export async function readDurableProjectConflict(projectId: string, ownerId: string, targetLanguage = 'en') {
  const row = await TranslationAttempt.collection.findOne({ projectId, ownerId, targetLanguage } as never, { projection: { _id: 1 }, readConcern: { level: 'majority' } });
  // Covers durable Customer attempts across revisions/processes; says NOTHING
  // about RAM-only ordinary/controlled GROUPS_V1 drafts in other processes.
  return { targetLanguage, status: row ? 'BLOCKED' : 'CLEAR', scope: 'DURABLE_CUSTOMER_ATTEMPTS_ALL_REVISIONS', ramOtherProcesses: 'UNKNOWN' };
}
