import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import dns from 'node:dns';
import test, { after, before } from 'node:test';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= randomBytes(48).toString('base64url');
process.env.JWT_REFRESH_SECRET ||= randomBytes(48).toString('base64url');
process.env.JWT_ACCESS_EXPIRES_IN ||= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ||= '7d';
dns.setServers(['8.8.8.8', '1.1.1.1']);

const suffix = randomUUID();
const customerEmail = `s18-test-customer-${suffix}@example.com`;
const injectedEmail = `s18-test-injected-${suffix}@example.com`;
const blockedEmail = `s18-test-blocked-${suffix}@example.com`;
const blockedRefreshEmail = `s18-test-blocked-refresh-${suffix}@example.com`;
const adminEmail = `s18-test-admin-${suffix}@example.com`;
const password = 'SecurePass123';
const testEmails = [customerEmail, injectedEmail, blockedEmail, blockedRefreshEmail, adminEmail];

const { app } = await import('../src/app.js');
const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const { AuthSession } = await import('../src/models/AuthSession.js');
const { User } = await import('../src/models/User.js');
const { authenticate } = await import('../src/middleware/authenticate.middleware.js');
const { authorize } = await import('../src/middleware/authorize.middleware.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { hashPassword, comparePassword } = await import('../src/utils/password.js');
const { env } = await import('../src/config/env.js');
const { seedAdmin } = await import('../src/scripts/seed-admin.js');
const { default: express } = await import('express');

let server: Server;
let rbacServer: Server;
let baseUrl = '';
let rbacUrl = '';
let customerAccessToken = '';
let customerRefreshToken = '';
let rotatedRefreshToken = '';
let adminAccessToken = '';
let blockedRefreshToken = '';
let blockedAccessToken = '';
let customerId = '';

const request = async (path: string, options: RequestInit = {}, origin = baseUrl) => {
  const response = await fetch(`${origin}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
  return { status: response.status, body: (await response.json()) as any };
};

const post = (path: string, body: unknown) => request(path, { method: 'POST', body: JSON.stringify(body) });

before(async () => {
  await connectDatabase(env.mongoUri);
  await User.deleteMany({ email: { $in: testEmails } });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Không lấy được cổng test.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  const rbacApp = express();
  rbacApp.get('/admin', authenticate, authorize('ADMIN'), (_request, response) => response.json({ success: true }));
  rbacApp.use(errorHandlerMiddleware);
  rbacServer = rbacApp.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => rbacServer.once('listening', resolve));
  const rbacAddress = rbacServer.address();
  if (!rbacAddress || typeof rbacAddress === 'string') throw new Error('Không lấy được cổng RBAC test.');
  rbacUrl = `http://127.0.0.1:${rbacAddress.port}`;
});

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const users = await User.find({ email: { $in: testEmails } }).select('_id');
  const userIds = users.map((user) => user._id);
  await Promise.all([
    AuthSession.deleteMany({ userId: { $in: userIds } }),
    ActivityLog.deleteMany({ userId: { $in: userIds } }),
  ]);
  await User.deleteMany({ _id: { $in: userIds } });
  await Promise.all([
    new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
    new Promise<void>((resolve, reject) => rbacServer.close((error) => (error ? reject(error) : resolve()))),
  ]);
  await disconnectDatabase();
});

test('S18 authentication integration', async (t) => {
  let registerBody: any;

  await t.test('1. valid customer registration returns 201', async () => {
    const result = await post('/api/auth/register', {
      fullName: '  Khách hàng S18  ', email: customerEmail.toUpperCase(), password, role: 'ADMIN',
    });
    assert.equal(result.status, 201);
    registerBody = result.body;
    customerAccessToken = result.body.data.accessToken;
    customerRefreshToken = result.body.data.refreshToken;
    customerId = result.body.data.user.id;
    assert.equal(result.body.data.user.email, customerEmail);
  });

  await t.test('2. password is stored as bcrypt hash', async () => {
    const user = await User.findById(customerId).select('+passwordHash');
    assert.ok(user);
    assert.notEqual(user.passwordHash, password);
    assert.equal(await comparePassword(password, user.passwordHash), true);
  });

  await t.test('3. register response excludes passwordHash', () => {
    assert.equal('passwordHash' in registerBody.data.user, false);
    assert.equal('password' in registerBody.data.user, false);
  });

  await t.test('4. registration forces CUSTOMER role', () => {
    assert.equal(registerBody.data.user.role, 'CUSTOMER');
  });

  await t.test('5. registration forces ACTIVE status', () => {
    assert.equal(registerBody.data.user.status, 'ACTIVE');
  });

  await t.test('6. duplicate email returns 409', async () => {
    const result = await post('/api/auth/register', { fullName: 'Duplicate', email: customerEmail, password });
    assert.equal(result.status, 409);
    assert.equal(result.body.error.code, 'EMAIL_ALREADY_EXISTS');
  });

  await t.test('7. invalid email returns 400', async () => {
    const result = await post('/api/auth/register', { fullName: 'Invalid', email: 'invalid', password });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('8. weak password returns 400', async () => {
    const result = await post('/api/auth/register', { fullName: 'Weak', email: `s18-test-weak-${suffix}@example.com`, password: 'weakpass' });
    assert.equal(result.status, 400);
  });

  await t.test('9. role injection cannot create ADMIN', async () => {
    const result = await post('/api/auth/register', { fullName: 'Injected', email: injectedEmail, password, role: 'ADMIN' });
    assert.equal(result.status, 201);
    assert.equal(result.body.data.user.role, 'CUSTOMER');
  });

  await t.test('10. valid customer login returns 200', async () => {
    const result = await post('/api/auth/login', { email: customerEmail, password });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.user.role, 'CUSTOMER');
    customerAccessToken = result.body.data.accessToken;
  });

  await t.test('11. admin seed creates ADMIN safely', async () => {
    process.env.ADMIN_SEED_NAME = 'S18 Test Admin';
    process.env.ADMIN_SEED_EMAIL = adminEmail;
    process.env.ADMIN_SEED_PASSWORD = password;
    assert.equal(await seedAdmin(), 'created');
    const admin = await User.findOne({ email: adminEmail }).select('+passwordHash');
    assert.ok(admin);
    assert.equal(admin.role, 'ADMIN');
    assert.equal(admin.status, 'ACTIVE');
    assert.equal(await comparePassword(password, admin.passwordHash), true);
  });

  await t.test('12. admin seed is idempotent', async () => {
    assert.equal(await seedAdmin(), 'exists');
    assert.equal(await User.countDocuments({ email: adminEmail }), 1);
  });

  await t.test('12b. admin seed never promotes an existing CUSTOMER', async () => {
    process.env.ADMIN_SEED_EMAIL = injectedEmail;
    await assert.rejects(seedAdmin(), /CUSTOMER/);
    process.env.ADMIN_SEED_EMAIL = adminEmail;
  });

  await t.test('13. valid admin login returns 200', async () => {
    const result = await post('/api/auth/login', { email: adminEmail, password });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.user.role, 'ADMIN');
    adminAccessToken = result.body.data.accessToken;
  });

  await t.test('14. wrong password returns generic 401', async () => {
    const result = await post('/api/auth/login', { email: customerEmail, password: 'WrongPass123' });
    assert.equal(result.status, 401);
    assert.equal(result.body.error.code, 'INVALID_CREDENTIALS');
  });

  await t.test('15. nonexistent email returns same generic 401', async () => {
    const result = await post('/api/auth/login', { email: `s18-test-none-${suffix}@example.com`, password });
    assert.equal(result.status, 401);
    assert.equal(result.body.error.code, 'INVALID_CREDENTIALS');
  });

  await t.test('16. BLOCKED account cannot login', async () => {
    await User.create({ fullName: 'Blocked', email: blockedEmail, passwordHash: await hashPassword(password), role: 'CUSTOMER', status: 'BLOCKED' });
    const result = await post('/api/auth/login', { email: blockedEmail, password });
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, 'ACCOUNT_BLOCKED');
  });

  await t.test('17. /me accepts valid access token', async () => {
    const result = await request('/api/auth/me', { headers: { authorization: `Bearer ${customerAccessToken}` } });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.user.id, customerId);
  });

  await t.test('18. /me without token returns 401', async () => {
    const result = await request('/api/auth/me');
    assert.equal(result.status, 401);
    assert.equal(result.body.error.code, 'AUTH_REQUIRED');
  });

  await t.test('19. malformed access token returns 401', async () => {
    const result = await request('/api/auth/me', { headers: { authorization: 'Bearer malformed' } });
    assert.equal(result.status, 401);
    assert.equal(result.body.error.code, 'INVALID_TOKEN');
  });

  await t.test('20. refresh token cannot be used as access token', async () => {
    const result = await request('/api/auth/me', { headers: { authorization: `Bearer ${customerRefreshToken}` } });
    assert.equal(result.status, 401);
  });

  await t.test('21. valid refresh rotates token pair', async () => {
    const result = await post('/api/auth/refresh', { refreshToken: customerRefreshToken });
    assert.equal(result.status, 200);
    assert.notEqual(result.body.data.refreshToken, customerRefreshToken);
    rotatedRefreshToken = result.body.data.refreshToken;
  });

  await t.test('22. invalid refresh token returns 401', async () => {
    const result = await post('/api/auth/refresh', { refreshToken: 'invalid' });
    assert.equal(result.status, 401);
  });

  await t.test('23. access token cannot be used as refresh token', async () => {
    const result = await post('/api/auth/refresh', { refreshToken: customerAccessToken });
    assert.equal(result.status, 401);
  });

  await t.test('24. rotated old refresh token cannot be reused', async () => {
    const result = await post('/api/auth/refresh', { refreshToken: customerRefreshToken });
    assert.equal(result.status, 401);
  });

  await t.test('25. refresh rejects a newly BLOCKED user', async () => {
    const registration = await post('/api/auth/register', { fullName: 'Blocked Refresh', email: blockedRefreshEmail, password });
    assert.equal(registration.status, 201);
    blockedRefreshToken = registration.body.data.refreshToken;
    blockedAccessToken = registration.body.data.accessToken;
    await User.updateOne({ email: blockedRefreshEmail }, { status: 'BLOCKED' });
    const result = await post('/api/auth/refresh', { refreshToken: blockedRefreshToken });
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, 'ACCOUNT_BLOCKED');
  });

  await t.test('25b. issued access token is rejected after user becomes BLOCKED', async () => {
    const result = await request('/api/auth/me', { headers: { authorization: `Bearer ${blockedAccessToken}` } });
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, 'ACCOUNT_BLOCKED');
  });

  await t.test('26. logout succeeds', async () => {
    const result = await post('/api/auth/logout', { refreshToken: rotatedRefreshToken });
    assert.equal(result.status, 200);
  });

  await t.test('27. logged-out refresh token cannot refresh', async () => {
    const result = await post('/api/auth/refresh', { refreshToken: rotatedRefreshToken });
    assert.equal(result.status, 401);
  });

  await t.test('28. CUSTOMER is denied by ADMIN RBAC', async () => {
    const result = await request('/admin', { headers: { authorization: `Bearer ${customerAccessToken}` } }, rbacUrl);
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, 'FORBIDDEN');
  });

  await t.test('29. ADMIN is allowed by ADMIN RBAC', async () => {
    const result = await request('/admin', { headers: { authorization: `Bearer ${adminAccessToken}` } }, rbacUrl);
    assert.equal(result.status, 200);
  });

  await t.test('30. auth responses never expose passwordHash', async () => {
    const result = await post('/api/auth/login', { email: customerEmail, password });
    assert.equal(JSON.stringify(result.body).includes('passwordHash'), false);
  });

  await t.test('31. refresh sessions store only token hashes', async () => {
    const sessions = await AuthSession.find({ userId: customerId }).select('+tokenHash');
    assert.ok(sessions.length > 0);
    assert.equal(sessions.some((session) => session.tokenHash === customerRefreshToken || session.tokenHash === rotatedRefreshToken), false);
    assert.equal(sessions.every((session) => /^[a-f0-9]{64}$/.test(session.tokenHash)), true);
  });

  await t.test('32. user document has no plaintext password field', async () => {
    const rawUser = await User.collection.findOne({ _id: new (await import('mongoose')).Types.ObjectId(customerId) });
    assert.ok(rawUser);
    assert.equal('password' in rawUser, false);
    assert.equal(typeof rawUser.passwordHash, 'string');
  });
});
