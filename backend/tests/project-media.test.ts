import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { access, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test, { after, before } from 'node:test';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= randomBytes(48).toString('base64url');
process.env.JWT_REFRESH_SECRET ||= randomBytes(48).toString('base64url');
process.env.JWT_ACCESS_EXPIRES_IN ||= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ||= '7d';
const suffix = randomUUID();
process.env.UPLOAD_DIR = `uploads/s19-test-${suffix}`;
process.env.MAX_UPLOAD_SIZE_MB = '0.0002';

const ownerEmail = `s19-test-owner-${suffix}@example.com`;
const otherEmail = `s19-test-other-${suffix}@example.com`;
const adminEmail = `s19-test-admin-${suffix}@example.com`;
const password = 'SecurePass123';
const testEmails = [ownerEmail, otherEmail, adminEmail];

const { app } = await import('../src/app.js');
const { env } = await import('../src/config/env.js');
const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
const { User } = await import('../src/models/User.js');
const { Project } = await import('../src/models/Project.js');
const { Media } = await import('../src/models/Media.js');
const { AuthSession } = await import('../src/models/AuthSession.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const { hashPassword } = await import('../src/utils/password.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const { uploadRoot } = await import('../src/utils/file.js');

let server: Server;
let baseUrl = '';
let ownerToken = '';
let otherToken = '';
let adminToken = '';
let ownerId = '';
let otherId = '';
let projectId = '';
let otherProjectId = '';
let currentStoredPath = '';

const request = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) as any : null };
};
const json = (path: string, method: string, token?: string, body?: unknown) => request(path, {
  method,
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const upload = (id: string, token: string | undefined, content: Uint8Array | undefined, type = 'video/mp4', name = 'sample.mp4') => {
  const form = new FormData();
  if (content) {
  const bytes = Uint8Array.from(content);
  form.append('file', new Blob([bytes.buffer], { type }), name);
            }
  return request(`/api/projects/${id}/media`, { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: form });
};

before(async () => {
  await connectDatabase(env.mongoUri);
  await User.deleteMany({ email: { $in: testEmails } });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolveReady) => server.once('listening', resolveReady));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Không lấy được test port.');
  baseUrl = `http://127.0.0.1:${address.port}`;
  for (const [email, target] of [[ownerEmail, 'owner'], [otherEmail, 'other']] as const) {
    const result = await json('/api/auth/register', 'POST', undefined, { fullName: target, email, password });
    if (target === 'owner') { ownerToken = result.body.data.accessToken; ownerId = result.body.data.user.id; }
    else { otherToken = result.body.data.accessToken; otherId = result.body.data.user.id; }
  }
  const admin = await User.create({ fullName: 'Admin S19', email: adminEmail, passwordHash: await hashPassword(password), role: 'ADMIN', status: 'ACTIVE' });
  adminToken = signAccessToken(admin._id.toString(), 'ADMIN');
});

after(async () => {
  const users = await User.find({ email: { $in: testEmails } }).select('_id');
  const userIds = users.map((user) => user._id);
  const projects = await Project.find({ userId: { $in: userIds } }).select('_id');
  const projectIds = projects.map((project) => project._id);
  await Promise.all([
    Media.deleteMany({ projectId: { $in: projectIds } }), Project.deleteMany({ _id: { $in: projectIds } }),
    AuthSession.deleteMany({ userId: { $in: userIds } }), ActivityLog.deleteMany({ userId: { $in: userIds } }),
  ]);
  await User.deleteMany({ _id: { $in: userIds } });
  const safeRoot = resolve(process.cwd(), 'uploads');
  assert.ok(uploadRoot.startsWith(`${safeRoot}\\`) || uploadRoot.startsWith(`${safeRoot}/`));
  await rm(uploadRoot, { recursive: true, force: true });
  await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  await disconnectDatabase();
});

test('S19 project and media integration', async (t) => {
  await t.test('1. unauthenticated create is rejected', async () => assert.equal((await json('/api/projects', 'POST', undefined, { name: 'x', sourceLanguage: 'vi' })).status, 401));
  await t.test('2-5. CUSTOMER creates server-owned DRAFT project at progress 0', async () => {
    const result = await json('/api/projects', 'POST', ownerToken, { name: 'Video S19 chính', description: 'Mô tả', sourceLanguage: 'VI' });
    assert.equal(result.status, 201); projectId = result.body.data.project.id;
    assert.equal(result.body.data.project.status, 'DRAFT'); assert.equal(result.body.data.project.progress, 0); assert.equal(result.body.data.project.sourceLanguage, 'vi');
    const raw = await Project.findById(projectId); assert.equal(raw?.userId.toString(), ownerId);
  });
  await t.test('6. invalid project input returns 400', async () => assert.equal((await json('/api/projects', 'POST', ownerToken, { name: '', sourceLanguage: '!' })).status, 400));
  await t.test('7. ADMIN cannot create customer project', async () => assert.equal((await json('/api/projects', 'POST', adminToken, { name: 'Admin project', sourceLanguage: 'vi' })).status, 403));
  await t.test('8-11. own-only list, pagination, search and status filter work', async () => {
    await json('/api/projects', 'POST', ownerToken, { name: 'Khác một', sourceLanguage: 'en' });
    await json('/api/projects', 'POST', ownerToken, { name: 'Khác hai', sourceLanguage: 'ja' });
    const other = await json('/api/projects', 'POST', otherToken, { name: 'Không được lộ', sourceLanguage: 'vi' }); otherProjectId = other.body.data.project.id;
    const page = await request('/api/projects?page=1&limit=2', { headers: { authorization: `Bearer ${ownerToken}` } });
    assert.equal(page.status, 200); assert.equal(page.body.data.projects.length, 2); assert.equal(page.body.data.pagination.total, 3);
    assert.equal(page.body.data.projects.every((project: any) => project.workflow?.step === 'UPLOAD' && project.workflow?.canResume === true), true);
    assert.equal(typeof page.body.data.projects[0].name, 'string'); assert.equal(typeof page.body.data.projects[0].createdAt, 'string');
    const search = await request('/api/projects?search=Video%20S19', { headers: { authorization: `Bearer ${ownerToken}` } }); assert.equal(search.body.data.projects.length, 1);
    const status = await request('/api/projects?status=DRAFT', { headers: { authorization: `Bearer ${ownerToken}` } }); assert.equal(status.body.data.projects.length, 3);
    assert.equal(JSON.stringify(page.body).includes('Không được lộ'), false);
  });
  await t.test('12. own detail returns backward-compatible DTO plus workflow', async () => {
    const response = await request(`/api/projects/${projectId}`, { headers: { authorization: `Bearer ${ownerToken}` } });
    assert.equal(response.status, 200); assert.equal(response.body.data.project.id, projectId);
    assert.equal(response.body.data.project.workflow.step, 'UPLOAD'); assert.equal(response.body.data.project.workflow.state, 'READY');
  });
  await t.test('13. cross-user detail is concealed as 404', async () => assert.equal((await request(`/api/projects/${otherProjectId}`, { headers: { authorization: `Bearer ${ownerToken}` } })).status, 404));
  await t.test('14. invalid ObjectId returns controlled 400', async () => assert.equal((await request('/api/projects/not-an-id', { headers: { authorization: `Bearer ${ownerToken}` } })).status, 400));
  await t.test('15. own update succeeds', async () => { const r = await json(`/api/projects/${projectId}`, 'PATCH', ownerToken, { name: 'Tên đã sửa' }); assert.equal(r.status, 200); assert.equal(r.body.data.project.name, 'Tên đã sửa'); });
  for (const field of ['status', 'progress', 'userId'] as const) await t.test(`16-18. privileged field ${field} is rejected`, async () => assert.equal((await json(`/api/projects/${projectId}`, 'PATCH', ownerToken, { [field]: field === 'progress' ? 90 : 'FAILED' })).status, 400));
  await t.test('19. cross-user update returns 404', async () => assert.equal((await json(`/api/projects/${otherProjectId}`, 'PATCH', ownerToken, { name: 'hack' })).status, 404));
  await t.test('20. cross-user delete returns 404', async () => assert.equal((await json(`/api/projects/${otherProjectId}`, 'DELETE', ownerToken)).status, 404));
  await t.test('21. own empty project delete succeeds', async () => { const p = await json('/api/projects', 'POST', ownerToken, { name: 'Xóa tôi', sourceLanguage: 'vi' }); assert.equal((await json(`/api/projects/${p.body.data.project.id}`, 'DELETE', ownerToken)).status, 200); });
  await t.test('22. upload without auth returns 401', async () => assert.equal((await upload(projectId, undefined, new Uint8Array([1]), 'video/mp4')).status, 401));
  await t.test('23-27. video upload stores safe metadata and physical file', async () => {
    const result = await upload(projectId, ownerToken, new Uint8Array([1, 2, 3]), 'video/mp4', '../../unsafe name.mp4');
    assert.equal(result.status, 201); assert.equal(result.body.data.media.mediaType, 'VIDEO'); assert.equal('storagePath' in result.body.data.media, false);
    const raw = await Media.findOne({ projectId }).select('+storagePath'); assert.ok(raw); currentStoredPath = raw.storagePath;
    assert.notEqual(raw.fileName, '../../unsafe name.mp4'); assert.equal(raw.originalName.includes('..'), false); await access(resolve(uploadRoot, raw.storagePath));
  });
  await t.test('28. unsupported MIME is rejected', async () => assert.equal((await upload(projectId, ownerToken, new Uint8Array([1]), 'text/plain', 'bad.txt')).status, 415));
  await t.test('29. oversized upload returns 413', async () => assert.equal((await upload(projectId, ownerToken, new Uint8Array(500), 'video/mp4')).status, 413));
  await t.test('30. missing file returns 400', async () => assert.equal((await upload(projectId, ownerToken, undefined)).status, 400));
  await t.test('31. cross-user upload returns 404', async () => assert.equal((await upload(otherProjectId, ownerToken, new Uint8Array([1]), 'audio/mpeg', 'x.mp3')).status, 404));
  await t.test('32. ADMIN cannot upload', async () => assert.equal((await upload(projectId, adminToken, new Uint8Array([1]), 'audio/mpeg', 'x.mp3')).status, 403));
  await t.test('33. upload changes project to UPLOADED', async () => assert.equal((await Project.findById(projectId))?.status, 'UPLOADED'));
  await t.test('34-35. GET media returns safe metadata', async () => { const r = await request(`/api/projects/${projectId}/media`, { headers: { authorization: `Bearer ${ownerToken}` } }); assert.equal(r.status, 200); assert.equal('storagePath' in r.body.data.media, false); });
  await t.test('36-38. audio replacement removes old file and remains one source', async () => {
    const oldAbsolute = resolve(uploadRoot, currentStoredPath); const r = await upload(projectId, ownerToken, new Uint8Array([4, 5]), 'audio/mpeg', 'new.mp3'); assert.equal(r.status, 201); assert.equal(r.body.data.media.mediaType, 'AUDIO');
    await assert.rejects(access(oldAbsolute)); assert.equal(await Media.countDocuments({ projectId }), 1);
    const raw = await Media.findOne({ projectId }); assert.ok(raw); currentStoredPath = raw.storagePath;
  });
  await t.test('39-41. delete media removes metadata/file and resets project', async () => {
    const absolute = resolve(uploadRoot, currentStoredPath); const r = await json(`/api/projects/${projectId}/media`, 'DELETE', ownerToken); assert.equal(r.status, 200);
    assert.equal(await Media.countDocuments({ projectId }), 0); await assert.rejects(access(absolute)); const project = await Project.findById(projectId); assert.equal(project?.status, 'DRAFT'); assert.equal(project?.progress, 0);
  });
  await t.test('42. deleting project cleans media metadata and file', async () => {
    await upload(projectId, ownerToken, new Uint8Array([7]), 'video/webm', 'last.webm'); const raw = await Media.findOne({ projectId }); assert.ok(raw); const absolute = resolve(uploadRoot, raw.storagePath);
    assert.equal((await json(`/api/projects/${projectId}`, 'DELETE', ownerToken)).status, 200); assert.equal(await Media.countDocuments({ projectId }), 0); await assert.rejects(access(absolute));
  });
  assert.notEqual(ownerId, otherId);
});
