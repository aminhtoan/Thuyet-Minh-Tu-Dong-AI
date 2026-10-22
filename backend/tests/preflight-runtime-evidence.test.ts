import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { TranslationAttempt } from '../src/models/TranslationAttempt.js';
import { readCustomerQuota, readDeploymentIdentity, readDurableProjectConflict } from '../src/services/translation/preflight-runtime-evidence.js';

test('quota reads exact UTC counter IDs and current config; missing counter means zero, no claim/write', async t => {
  const old = { ...process.env };
  process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT = '20'; process.env.CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT = '200';
  const day = new Date().toISOString().slice(0, 10), owner = '1'.repeat(24);
  let rows: any[] = [];
  t.mock.method(TranslationAttempt.collection, 'find', (filter: any, options: any) => {
    assert.deepEqual(filter._id.$in, [`customer-day:${owner}:${day}`, `customer-global-day:${day}`]);
    assert.equal(options.limit, 2); assert.equal(options.readConcern.level, 'majority');
    return { toArray: async () => rows } as any;
  });
  for (const method of ['insertOne', 'updateOne', 'deleteOne'] as const) t.mock.method(TranslationAttempt.collection, method, () => { throw Error('WRITE_FORBIDDEN'); });
  try {
    let result = await readCustomerQuota(owner);
    assert.equal(result.userRemaining, 20); assert.equal(result.globalRemaining, 200); assert.equal(result.reservation, false);
    rows = [{ _id: `customer-day:${owner}:${day}`, count: 20, kind: 'QUOTA' }, { _id: `customer-global-day:${day}`, count: 55, kind: 'QUOTA' }];
    result = await readCustomerQuota(owner); assert.equal(result.available, false); assert.equal(result.userRemaining, 0); assert.equal(result.globalRemaining, 145);
    rows[0].count = -1; await assert.rejects(readCustomerQuota(owner));
    rows[0].count = 1.5; await assert.rejects(readCustomerQuota(owner));
    rows[0].count = 1; rows[0].kind = 'CLAIMED'; await assert.rejects(readCustomerQuota(owner));
    process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT = '0'; await assert.rejects(readCustomerQuota(owner));
  } finally { process.env = old; }
});

test('deployment observes serving connection hello only, returns fingerprint not identity secrets', async () => {
  const connection = mongoose.connection;
  const descriptors = ['db', 'readyState'].map(key => [key, Object.getOwnPropertyDescriptor(connection, key)] as const);
  let calls = 0;
  Object.defineProperty(connection, 'readyState', { configurable: true, value: 1 });
  Object.defineProperty(connection, 'db', { configurable: true, value: { databaseName: 'PRIVATE_DATABASE', admin: () => ({ command: async (value: unknown) => { assert.deepEqual(value, { hello: 1 }); calls++; return { isWritablePrimary: true, setName: 'PRIVATE_REPLICA', hosts: ['PRIVATE_HOST:27017'] }; } }) } });
  try {
    const first = await readDeploymentIdentity(), second = await readDeploymentIdentity();
    assert.equal(first.status, 'VERIFIED'); assert.match(first.fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(first.fingerprint, second.fingerprint); assert.equal(first.instanceId, second.instanceId);
    assert.equal(first.intendedTargetApproval, 'MISMATCH'); assert.equal(calls, 2);
    assert.doesNotMatch(JSON.stringify(first), /PRIVATE|mongodb|password/);
    Object.defineProperty(connection, 'readyState', { configurable: true, value: 0 });
    await assert.rejects(readDeploymentIdentity());
  } finally { for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(connection, key, descriptor); else Reflect.deleteProperty(connection, key); } }
});

test('approval compares actual database name AND Atlas membership in development, not fingerprint alone', async () => {
  const connection = mongoose.connection, oldEnv = process.env.NODE_ENV;
  const descriptors = ['db', 'readyState'].map(key => [key, Object.getOwnPropertyDescriptor(connection, key)] as const);
  let databaseName = 'multilingual_ai_narration', hosts = ['fixture.mongodb.net:27017'];
  Object.defineProperty(connection, 'readyState', { configurable: true, value: 1 });
  Object.defineProperty(connection, 'db', { configurable: true, value: { get databaseName() { return databaseName; }, admin: () => ({ command: async () => ({ isWritablePrimary: true, setName: 'synthetic-set', hosts }) }) } });
  try {
    process.env.NODE_ENV = 'development';
    assert.equal((await readDeploymentIdentity()).intendedTargetApproval, 'APPROVED_BY_USER');
    databaseName = 'wrong_database'; assert.equal((await readDeploymentIdentity()).intendedTargetApproval, 'MISMATCH');
    databaseName = 'multilingual_ai_narration'; hosts = ['localhost:27017']; assert.equal((await readDeploymentIdentity()).intendedTargetApproval, 'MISMATCH');
    hosts = ['fixture.mongodb.net:27017']; process.env.NODE_ENV = 'production'; assert.equal((await readDeploymentIdentity()).intendedTargetApproval, 'MISMATCH');
  } finally {
    if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(connection, key, descriptor); else Reflect.deleteProperty(connection, key); }
  }
});

test('cross-process durable check is owner/project scoped across revisions, never claims RAM absence', async t => {
  let found = false;
  t.mock.method(TranslationAttempt.collection, 'findOne', async (filter: any, options: any) => {
    assert.deepEqual(filter, { projectId: 'project', ownerId: 'owner', targetLanguage: 'en' });
    assert.equal(options.readConcern.level, 'majority'); assert.deepEqual(options.projection, { _id: 1 });
    return found ? { _id: 'synthetic' } as any : null;
  });
  let result = await readDurableProjectConflict('project', 'owner');
  assert.equal(result.status, 'CLEAR'); assert.equal(result.ramOtherProcesses, 'UNKNOWN');
  found = true; result = await readDurableProjectConflict('project', 'owner');
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.ramOtherProcesses, 'UNKNOWN');
});
