import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test, { after, before } from 'node:test';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= randomBytes(48).toString('base64url');
process.env.JWT_REFRESH_SECRET ||= randomBytes(48).toString('base64url');

const suffix = randomUUID();
const adminEmail = `analytics-admin-${suffix}@example.com`;
const customerEmail = `analytics-cust-${suffix}@example.com`;
const password = 'SecurePass123';
const emails = [adminEmail, customerEmail];

const { app } = await import('../src/app.js');
const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
const { env } = await import('../src/config/env.js');
const { User } = await import('../src/models/User.js');
const { AuthSession } = await import('../src/models/AuthSession.js');
const { ListenEvent } = await import('../src/models/ListenEvent.js');
const { hashPassword } = await import('../src/utils/password.js');
const { signAccessToken } = await import('../src/utils/jwt.js');

let server: Server;
let baseUrl = '';
let adminToken = '';
let customerToken = '';
let customerId = '';

const request = async (path: string, token?: string, options: RequestInit = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
};
const data = (result: Awaited<ReturnType<typeof request>>) => result.body?.data as Record<string, unknown>;

before(async () => {
  await connectDatabase(env.mongoUri);
  await User.deleteMany({ email: { $in: emails } });

  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Không lấy được test port.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  const admin = await User.create({
    fullName: 'Admin Analytics',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE',
  });
  adminToken = signAccessToken(admin._id.toString(), 'ADMIN');

  const customer = await User.create({
    fullName: 'Customer Analytics',
    email: customerEmail,
    passwordHash: await hashPassword(password),
    role: 'CUSTOMER',
    status: 'ACTIVE',
  });
  customerId = customer._id.toString();
  customerToken = signAccessToken(customerId, 'CUSTOMER');
});

after(async () => {
  const users = await User.find({ email: { $in: emails } }).select('_id');
  const userIds = users.map((u) => u._id);
  await Promise.all([
    AuthSession.deleteMany({ userId: { $in: userIds } }),
    ListenEvent.deleteMany({ userId: { $in: userIds } }),
  ]);
  await User.deleteMany({ _id: { $in: userIds } });
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  await disconnectDatabase();
});

test('Analytics API and listen tracking', async (t) => {
  await t.test('POST /api/analytics/listen rejects invalid platform', async () => {
    const res = await request('/api/analytics/listen', undefined, {
      method: 'POST',
      body: JSON.stringify({ platform: 'desktop' }),
    });
    assert.equal(res.status, 400);
  });

  await t.test('POST /api/analytics/listen records web and mobile clicks anonymously or with user', async () => {
    const webRes = await request('/api/analytics/listen', undefined, {
      method: 'POST',
      body: JSON.stringify({ platform: 'web', languageCode: 'vi' }),
    });
    assert.equal(webRes.status, 201);
    assert.equal(data(webRes).tracked, true);
    assert.equal(data(webRes).platform, 'web');

    const mobileRes = await request('/api/analytics/listen', customerToken, {
      method: 'POST',
      body: JSON.stringify({ platform: 'mobile', languageCode: 'en' }),
    });
    assert.equal(mobileRes.status, 201);
    assert.equal(data(mobileRes).tracked, true);
    assert.equal(data(mobileRes).platform, 'mobile');
  });

  await t.test('GET /api/analytics/listen-stats returns aggregated metrics and breakdowns', async () => {
    const statsRes = await request('/api/analytics/listen-stats');
    assert.equal(statsRes.status, 200);
    const stats = data(statsRes);
    assert.ok(typeof stats.total === 'number' && stats.total >= 2);
    assert.ok(typeof stats.web === 'number' && stats.web >= 1);
    assert.ok(typeof stats.mobile === 'number' && stats.mobile >= 1);
    assert.ok(Array.isArray(stats.topLanguages));
    assert.ok(Array.isArray(stats.topAudios));
  });

  await t.test('GET /api/admin/dashboard includes totalListens, listenStats and listenAnalytics', async () => {
    const res = await request('/api/admin/dashboard', adminToken);
    assert.equal(res.status, 200);
    const payload = data(res);
    const stats = payload.stats as {
      totalCustomers: number;
      totalProjects: number;
      totalListens: number;
      listenStats: { total: number; web: number; mobile: number };
    };
    assert.ok(typeof stats.totalListens === 'number' && stats.totalListens >= 2);
    assert.ok(typeof stats.listenStats.web === 'number' && stats.listenStats.web >= 1);
    assert.ok(typeof stats.listenStats.mobile === 'number' && stats.listenStats.mobile >= 1);
    const listenAnalytics = payload.listenAnalytics as {
      topLanguages: Array<{ code: string; count: number; name: string }>;
      topAudios: Array<{ title: string; count: number }>;
    };
    assert.ok(Array.isArray(listenAnalytics.topLanguages));
    assert.ok(Array.isArray(listenAnalytics.topAudios));
  });
});
