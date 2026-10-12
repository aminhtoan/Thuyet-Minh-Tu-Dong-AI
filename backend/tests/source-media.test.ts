import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { Types } from 'mongoose';

const directory = await mkdtemp(join(tmpdir(), 'source-media-test-'));
process.env.NODE_ENV = 'test'; process.env.UPLOAD_DIR = directory;
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/source_media_mock';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex'); process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '7d';
const { default: express } = await import('express');
const { projectRouter } = await import('../src/routes/project.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { User } = await import('../src/models/User.js');
const { Project } = await import('../src/models/Project.js');
const { Media } = await import('../src/models/Media.js');
const { signAccessToken } = await import('../src/utils/jwt.js');

test('authenticated source streaming actual route with DB mocks only', async (t) => {
  const owner = new Types.ObjectId(); const other = new Types.ObjectId(); const projectId = new Types.ObjectId();
  const user = { _id: owner, fullName: 'Test', email: 'test@example.test', role: 'CUSTOMER', status: 'ACTIVE' };
  let media: any = { mimeType: 'audio/mpeg', storagePath: 'source.mp3' };
  t.mock.method(User, 'findById', async (id: string) => ({ ...user, _id: id === owner.toString() ? owner : other }));
  t.mock.method(Project, 'findOne', (filter: any) => ({ select: async () => filter._id === projectId.toString() && filter.userId === owner.toString() ? { _id: projectId } : null }));
  t.mock.method(Media, 'findOne', async () => media);
  const bytes = Buffer.from('0123456789abcdefghij'); await writeFile(join(directory, 'source.mp3'), bytes); await writeFile(join(directory, 'source.mp4'), bytes);
  const app = express(); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/projects/${projectId}/media/file`;
  const token = signAccessToken(owner.toString(), 'CUSTOMER'); const otherToken = signAccessToken(other.toString(), 'CUSTOMER');
  const call = (options: RequestInit = {}, auth: string | null = token, url = base) => fetch(url, { ...options, headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...options.headers } });
  try {
    await t.test('unauthenticated and token-in-query are rejected', async () => { assert.equal((await call({}, null)).status, 401); assert.equal((await call({}, null, base + '?token=not-a-token')).status, 401); });
    await t.test('cross-user, blocked and Admin cannot stream', async () => {
      assert.equal((await call({}, otherToken)).status, 404);
      user.status = 'BLOCKED'; assert.equal((await call()).status, 403); user.status = 'ACTIVE';
      user.role = 'ADMIN'; assert.equal((await call()).status, 403); user.role = 'CUSTOMER';
    });
    await t.test('MP3 streamed with correct headers and no path leakage', async () => {
      const res = await call(); assert.equal(res.status, 200); assert.equal(res.headers.get('content-type'), 'audio/mpeg'); assert.equal(res.headers.get('content-length'), '20'); assert.equal(res.headers.get('accept-ranges'), 'bytes'); assert.equal(res.headers.get('cache-control'), 'private, no-store'); assert.deepEqual(Buffer.from(await res.arrayBuffer()), bytes); assert.doesNotMatch(JSON.stringify([...res.headers]), /storagePath|source\.mp3|source-media-test/);
    });
    await t.test('MP4 streamed with correct content type', async () => { media = { mimeType: 'video/mp4', storagePath: 'source.mp4' }; const res = await call(); assert.equal(res.headers.get('content-type'), 'video/mp4'); assert.deepEqual(Buffer.from(await res.arrayBuffer()), bytes); });
    await t.test('HEAD full metadata without body', async () => { const res = await call({ method: 'HEAD' }); assert.equal(res.status, 200); assert.equal(res.headers.get('content-length'), '20'); assert.equal((await res.arrayBuffer()).byteLength, 0); });
    for (const [range, start, end] of [['bytes=2-5', 2, 5], ['bytes=17-', 17, 19], ['bytes=-3', 17, 19], ['bytes=0-999', 0, 19]] as const) await t.test(`valid ${range}`, async () => {
      const res = await call({ headers: { range } }); assert.equal(res.status, 206); assert.equal(res.headers.get('content-range'), `bytes ${start}-${end}/20`); assert.equal(res.headers.get('content-length'), String(end - start + 1)); assert.deepEqual(Buffer.from(await res.arrayBuffer()), bytes.subarray(start, end + 1));
    });
    await t.test('invalid ranges produce 416 and no file bytes', async () => { for (const range of ['bytes=20-', 'bytes=5-2', 'bytes=-0', 'bytes=-', 'bytes=0-1,4-5', 'invalid', 'bytes=9007199254740992-']) { const res = await call({ headers: { range } }); assert.equal(res.status, 416); assert.equal(res.headers.get('content-range'), 'bytes */20'); assert.equal((await res.arrayBuffer()).byteLength, 0); } });
    await t.test('metadata missing, disk missing and unsupported format', async () => {
      media = null; assert.equal((await call()).status, 404);
      media = { mimeType: 'audio/mpeg', storagePath: 'missing.mp3' }; assert.equal((await call()).status, 404);
      media = { mimeType: 'audio/wav', storagePath: 'source.mp3' }; assert.equal((await call()).status, 415);
    });
    await t.test('path traversal stored in mock metadata denied with safe response', async () => { media = { mimeType: 'audio/mpeg', storagePath: '../private.mp3' }; const res = await call(); assert.equal(res.status, 404); assert.doesNotMatch(await res.text(), /private\.mp3|source-media-test|storagePath/); });
    await t.test('client path query cannot change selected file', async () => { media = { mimeType: 'audio/mpeg', storagePath: 'source.mp3' }; const res = await call({}, token, base + '?path=../../private.mp3'); assert.deepEqual(Buffer.from(await res.arrayBuffer()), bytes); });
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await rm(directory, { recursive: true, force: true }); }
});
