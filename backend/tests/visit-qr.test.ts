import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test, { after, before } from 'node:test';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= randomBytes(48).toString('base64url');
process.env.JWT_REFRESH_SECRET ||= randomBytes(48).toString('base64url');
process.env.JWT_ACCESS_EXPIRES_IN ||= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ||= '7d';

const suffix = randomUUID();
const adminEmail = `visitqr-admin-${suffix}@example.com`;
const customerEmail = `visitqr-customer-${suffix}@example.com`;
const password = 'AdminPassword123!';

const { app } = await import('../src/app.js');
const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
const { env } = await import('../src/config/env.js');
const { User } = await import('../src/models/User.js');
const { VisitQR } = await import('../src/models/VisitQR.js');
const { hashPassword } = await import('../src/utils/password.js');
const { signAccessToken } = await import('../src/utils/jwt.js');

let server: Server;
let baseUrl = '';
let adminToken = '';
let customerToken = '';
let adminId = '';
let customerId = '';

const request = async (path: string, token?: string, options: RequestInit = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    redirect: 'manual',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  let parsedBody: Record<string, unknown> | null = null;
  try {
    if (text) parsedBody = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsedBody = null;
  }
  return {
    status: response.status,
    headers: response.headers,
    body: parsedBody,
  };
};

const data = (result: Awaited<ReturnType<typeof request>>) => result.body?.data as Record<string, unknown>;

before(async () => {
  await connectDatabase(env.mongoUri);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Không lấy được test port.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  const admin = await User.create({
    fullName: 'VisitQR Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE',
  });
  adminId = admin._id.toString();
  adminToken = signAccessToken(adminId, 'ADMIN');

  const customer = await User.create({
    fullName: 'VisitQR Customer',
    email: customerEmail,
    passwordHash: await hashPassword(password),
    role: 'CUSTOMER',
    status: 'ACTIVE',
  });
  customerId = customer._id.toString();
  customerToken = signAccessToken(customerId, 'CUSTOMER');
});

after(async () => {
  await User.deleteMany({ _id: { $in: [adminId, customerId] } });
  await VisitQR.deleteMany({ source: new RegExp(`test_${suffix}`) });
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await disconnectDatabase();
});

test('VisitQR tracking endpoints and Admin API', async (t) => {
  await t.test('GET /api/qr/visit records visit and responds with 302 redirect', async () => {
    const testSource = `test_${suffix}_footer`;
    const res = await request(
      `/api/qr/visit?source=${testSource}&target=/thuyet-minh`,
      undefined,
      {
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
          'x-forwarded-for': '203.0.113.195',
        },
      },
    );

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location);
    assert.match(location, /\/thuyet-minh$/);

    const doc = await VisitQR.findOne({ source: testSource });
    assert.ok(doc);
    assert.equal(doc.source, testSource);
    assert.equal(doc.ipAddress, '203.0.113.195');
    assert.equal(doc.deviceType, 'mobile');
    assert.equal(doc.os, 'iOS');
    assert.equal(doc.browser, 'Safari');
    assert.equal(doc.targetPath, '/thuyet-minh');
  });

  await t.test('POST /api/qr/track records JSON visit event', async () => {
    const testSource = `test_${suffix}_app`;
    const res = await request(
      '/api/qr/track',
      undefined,
      {
        method: 'POST',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'x-forwarded-for': '198.51.100.44',
        },
        body: JSON.stringify({
          source: testSource,
          targetPath: '/kham-pha',
          location: 'Gian trưng bày 1',
        }),
      },
    );

    assert.equal(res.status, 201);
    assert.equal(data(res).recorded, true);

    const doc = await VisitQR.findOne({ source: testSource });
    assert.ok(doc);
    assert.equal(doc.deviceType, 'desktop');
    assert.equal(doc.os, 'Windows');
    assert.equal(doc.browser, 'Chrome');
    assert.equal(doc.location, 'Gian trưng bày 1');
  });

  await t.test('GET /api/admin/visit-qr rejects unauthenticated and non-admin requests', async () => {
    assert.equal((await request('/api/admin/visit-qr')).status, 401);
    assert.equal((await request('/api/admin/visit-qr', customerToken)).status, 403);
  });

  await t.test('GET /api/admin/visit-qr returns paginated items and summary for ADMIN', async () => {
    const res = await request(
      `/api/admin/visit-qr?search=${suffix}&page=1&limit=10`,
      adminToken,
    );
    assert.equal(res.status, 200);
    const body = data(res);
    assert.ok(body.items);
    assert.ok(body.summary);
    assert.ok(typeof (body.summary as Record<string, number>).today === 'number');
    assert.ok(typeof (body.summary as Record<string, number>).todayUnique === 'number');
    assert.ok(typeof (body.summary as Record<string, number>).total === 'number');
    assert.ok(typeof (body.summary as Record<string, number>).totalUnique === 'number');
    assert.ok(body.pagination);
  });
});
