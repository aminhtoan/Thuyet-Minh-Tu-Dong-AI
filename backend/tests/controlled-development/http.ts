import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

test('actual development DENY HTTP runtime: JWT/RBAC/ownership/deleted user and blocked mutation', async () => {
  const uri = 'mongodb://narration-groups-test-mongodb:27029/multilingual_ai_narration_groups_test?replicaSet=narration-test-rs&directConnection=true';
  if (process.env.HOSTNAME !== 'narration-controlled-readiness' || process.env.NODE_ENV !== 'development' || process.env.CONTROLLED_PROVIDER_MODE !== 'DENY' || process.env.TEST_MONGODB_URI !== uri || !/^[a-f\d]{24}$/.test(process.env.EXPECTED_MONGO_PROCESS_ID ?? '')) throw new Error('HTTP_TEST_ISOLATION_DENIED');
  const connection = await mongoose.createConnection(uri, { dbName: 'multilingual_ai_narration_groups_test', autoCreate: false, autoIndex: false, maxPoolSize: 2 }).asPromise();
  const db = connection.db!;
  const users = Array.from({ length: 4 }, () => new mongoose.Types.ObjectId());
  const project = new mongoose.Types.ObjectId();
  let wrote = false;
  try {
    const h = await db.admin().command({ hello: 1 });
    assert.equal(db.databaseName, 'multilingual_ai_narration_groups_test');
    assert.equal(h.setName, 'narration-test-rs'); assert.equal(h.isWritablePrimary, true);
    assert.equal(h.topologyVersion.processId.toString(), process.env.EXPECTED_MONGO_PROCESS_ID);
    assert.deepEqual(h.hosts, ['localhost:27029']);
    const { accessSecret } = JSON.parse(readFileSync('/tmp/readiness-auth.json', 'utf8'));
    const token = (index: number, role = 'CUSTOMER') => jwt.sign({ sub: String(users[index]), role, type: 'access' }, accessSecret, { expiresIn: '1m' });
    wrote = true; // Track IDs before the first insert, including partial failures.
    await db.collection('users').insertMany(users.map((_id, i) => ({ _id, fullName: 'Isolated readiness fixture', email: `readiness-${_id}@example.invalid`, role: i === 2 ? 'ADMIN' : 'CUSTOMER', status: 'ACTIVE', deletedAt: i === 3 ? new Date() : null, passwordHash: 'not-a-login-password' })));
    await db.collection('projects').insertOne({ _id: project, userId: users[0], name: 'Synthetic readiness fixture', sourceLanguage: 'vi', status: 'TRANSCRIBED' });
    const request = async (path: string, auth?: string, method = 'GET') => fetch(`http://127.0.0.1:8082${path}`, { method, headers: auth ? { Authorization: `Bearer ${auth}` } : {}, signal: AbortSignal.timeout(5000) });
    const path = `/api/projects/${project}/preflight`;
    assert.equal((await request('/api/health')).status, 200);
    assert.equal((await request(path)).status, 401);
    assert.equal((await request(path, 'invalid')).status, 401);
    assert.equal((await request(path, token(2, 'ADMIN'))).status, 403);
    assert.equal((await request(path, token(1))).status, 404);
    assert.equal((await request(path, token(3))).status, 401);
    // Owned synthetic project exists, but is NOT the approved museum source.
    const scoped = await request(path, token(0)); assert.equal(scoped.status, 403);
    assert.equal((await scoped.json() as any).error.code, 'CONTROLLED_SCOPE_DENIED');
    assert.equal((await request(`/api/projects/${project}/translations/preview`, token(0), 'POST')).status, 503);
    assert.equal((await request(`/api/projects/${project}/transcription`, token(0), 'POST')).status, 503);
    const health = await (await request('/api/health')).json() as any;
    assert.equal(health.mode, 'DENY'); assert.equal(health.ledger.reservedCredits, 0);
  } finally {
    if (wrote) {
      await db.collection('projects').deleteOne({ _id: project });
      await db.collection('users').deleteMany({ _id: { $in: users } });
      assert.equal(await db.collection('projects').countDocuments({ _id: project }), 0);
      assert.equal(await db.collection('users').countDocuments({ _id: { $in: users } }), 0);
      console.log('READINESS_FIXTURE_CLEANUP: 0 remaining; test database only');
    }
    await connection.close();
  }
});
