// Explicit executable, not part of automatic *.test.ts discovery.
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { connectIsolatedMongo, TEST_DATABASE, TEST_REPLICA_SET } from './helpers/isolated-mongo.js';

try {
  const { instance, db, version } = await connectIsolatedMongo();
  console.log({ isolation: 'PASS', database: TEST_DATABASE, port: 27029, replicaSet: TEST_REPLICA_SET, version });
  const runId = randomUUID(), committed = new Types.ObjectId(), rolledBack = new Types.ObjectId();
  const collection = db.collection('_groups_environment_smoke');
  const session = await instance.startSession();
  try {
    // Bootstrap only this run's fixture, not a database/index/schema migration.
    await collection.insertOne({ _id: committed, runId, state: 'before' });
    await session.withTransaction(async () => {
      await collection.updateOne({ _id: committed, runId }, { $set: { state: 'committed' } }, { session });
    });
    assert.equal((await collection.findOne({ _id: committed, runId }))?.state, 'committed');
    await assert.rejects(session.withTransaction(async () => {
      await collection.updateOne({ _id: committed, runId }, { $set: { state: 'must-rollback' } }, { session });
      await collection.insertOne({ _id: rolledBack, runId, state: 'must-rollback' }, { session });
      throw new Error('EXPECTED_SMOKE_ROLLBACK');
    }), /EXPECTED_SMOKE_ROLLBACK/);
    assert.equal((await collection.findOne({ _id: committed, runId }))?.state, 'committed');
    assert.equal(await collection.findOne({ _id: rolledBack, runId }), null);
    console.log('Transaction commit: PASS; rollback: PASS');
  } finally {
    try {
      await session.endSession();
      // Two explicit IDs AND unique run marker; never drop database/collection/volume.
      await collection.deleteOne({ _id: committed, runId });
      await collection.deleteOne({ _id: rolledBack, runId });
      assert.equal(await collection.countDocuments({ runId }), 0);
      console.log('Fixture cleanup: PASS');
    } finally { await instance.disconnect(); }
  }
} catch {
  console.error('ISOLATED_MONGO_SMOKE_BLOCKED_OR_FAILED (details suppressed; no development fallback)');
  process.exitCode = 1;
}
