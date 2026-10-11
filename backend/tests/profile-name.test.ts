import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { Types } from 'mongoose';

// Never connect to a database. Override configuration before loading the app.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/profile_unit_test';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
const { default: express } = await import('express');
const { authRouter } = await import('../src/routes/auth.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use(errorHandlerMiddleware);
const { User } = await import('../src/models/User.js');
const { signAccessToken } = await import('../src/utils/jwt.js');

test('self profile name API with mocked persistence only', async (t) => {
  const own = { _id: new Types.ObjectId(), fullName: 'Tên cũ', email: 'owner@example.test', role: 'CUSTOMER', status: 'ACTIVE', passwordHash: 'never-return' };
  const other = { ...own, _id: new Types.ObjectId(), fullName: 'Người khác', email: 'other@example.test' };
  let writes = 0;
  t.mock.method(User, 'findById', async (id: string) => id === own._id.toString() ? own : other);
  t.mock.method(User, 'findOneAndUpdate', async (filter: { _id: string; status: string }, update: { $set: { fullName: string } }, options: unknown) => {
    assert.deepEqual(filter, { _id: own._id.toString(), status: 'ACTIVE' });
    assert.deepEqual(Object.keys(update.$set), ['fullName']);
    assert.deepEqual(options, { returnDocument: 'after', runValidators: true });
    writes++; own.fullName = update.$set.fullName; return own;
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const token = signAccessToken(own._id.toString(), 'CUSTOMER');
  const call = async (body?: unknown, auth: string | null = token, method = 'PATCH') => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/me`, { method, headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    await t.test('authentication required', async () => { assert.equal((await call({ fullName: 'New' }, null)).status, 401); });
    await t.test('reject empty, short and long names', async () => {
      for (const fullName of ['', '   ', 'A', 'x'.repeat(101)]) {
        const result = await call({ fullName }); assert.equal(result.status, 400); assert.equal(result.body.error.code, 'VALIDATION_ERROR');
      }
      assert.equal(writes, 0);
    });
    await t.test('reject all extra fields and cross-account IDs', async () => {
      for (const field of ['userId', 'id', 'email', 'role', 'password', 'passwordHash']) assert.equal((await call({ fullName: 'Tên mới', [field]: other._id.toString() })).status, 400);
      assert.equal(writes, 0); assert.equal(other.fullName, 'Người khác');
    });
    await t.test('trim Vietnamese name; safe DTO and unchanged sensitive fields', async () => {
      const result = await call({ fullName: '  Nguyễn Ánh  ' });
      assert.equal(result.status, 200); assert.equal(result.body.data.user.fullName, 'Nguyễn Ánh');
      assert.equal(result.body.data.user.email, own.email); assert.equal(result.body.data.user.role, 'CUSTOMER');
      assert.equal('passwordHash' in result.body.data.user, false); assert.equal(own.passwordHash, 'never-return'); assert.equal(writes, 1);
    });
    await t.test('subsequent GET reload sees persisted mock value', async () => { assert.equal((await call(undefined, token, 'GET')).body.data.user.fullName, 'Nguyễn Ánh'); });
    await t.test('blocked user cannot write', async () => { own.status = 'BLOCKED'; assert.equal((await call({ fullName: 'Blocked' })).status, 403); assert.equal(writes, 1); own.status = 'ACTIVE'; });
    await t.test('storage error is sanitized and leaves old name', async () => {
      t.mock.method(User, 'findOneAndUpdate', async () => { throw new Error('private-database-detail'); });
      const result = await call({ fullName: 'Not saved' }); assert.equal(result.status, 500); assert.equal(own.fullName, 'Nguyễn Ánh'); assert.doesNotMatch(JSON.stringify(result.body), /private-database-detail/);
    });
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
