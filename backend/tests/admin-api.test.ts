import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test, { after, before } from 'node:test';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= randomBytes(48).toString('base64url');
process.env.JWT_REFRESH_SECRET ||= randomBytes(48).toString('base64url');
process.env.JWT_ACCESS_EXPIRES_IN ||= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ||= '7d';
process.env.TTS_PROVIDER = 'openai';

const suffix = randomUUID();
const customerEmail = `s24-1-customer-${suffix}@example.com`;
const secondEmail = `s24-1-second-${suffix}@example.com`;
const blockedEmail = `s24-1-blocked-${suffix}@example.com`;
const adminEmail = `s24-1-admin-${suffix}@example.com`;
const password = 'SecurePass123';
const emails = [customerEmail, secondEmail, blockedEmail, adminEmail];

const { app } = await import('../src/app.js');
const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
const { env } = await import('../src/config/env.js');
const { User } = await import('../src/models/User.js');
const { AuthSession } = await import('../src/models/AuthSession.js');
const { Project } = await import('../src/models/Project.js');
const { Media } = await import('../src/models/Media.js');
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { Language } = await import('../src/models/Language.js');
const { Voice } = await import('../src/models/Voice.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const { hashPassword } = await import('../src/utils/password.js');
const { signAccessToken } = await import('../src/utils/jwt.js');

let server: Server; let baseUrl = ''; let customerToken = ''; let adminToken = ''; let blockedToken = '';
let customerId = ''; let secondId = ''; let adminId = ''; let projectId = ''; let jobId = ''; let languageId = ''; let voiceId = '';

const request = async (path: string, token?: string, options: RequestInit = {}) => { const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers } }); const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) as Record<string, unknown> : null }; };
const data = (result: Awaited<ReturnType<typeof request>>) => result.body?.data as Record<string, unknown>;

before(async () => {
  await connectDatabase(env.mongoUri); await User.deleteMany({ email: { $in: emails } });
  server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve)); const address = server.address(); if (!address || typeof address === 'string') throw new Error('Không lấy được test port.'); baseUrl = `http://127.0.0.1:${address.port}`;
  for (const email of [customerEmail, secondEmail]) { const result = await request('/api/auth/register', undefined, { method: 'POST', body: JSON.stringify({ fullName: email === customerEmail ? 'Khách S24 Một' : 'Khách S24 Hai', email, password }) }); const user = (data(result).user as { id: string }); if (email === customerEmail) { customerId = user.id; customerToken = data(result).accessToken as string; } else secondId = user.id; }
  const blocked = await User.create({ fullName: 'Blocked S24', email: blockedEmail, passwordHash: await hashPassword(password), role: 'CUSTOMER', status: 'BLOCKED' }); blockedToken = signAccessToken(blocked._id.toString(), 'CUSTOMER');
  const admin = await User.create({ fullName: 'Admin S24', email: adminEmail, passwordHash: await hashPassword(password), role: 'ADMIN', status: 'ACTIVE' }); adminId = admin._id.toString(); adminToken = signAccessToken(adminId, 'ADMIN');
  const language = await Language.create({ code: `xx-${suffix.slice(0, 6)}`, name: 'Test Language', nativeName: 'Test Language', isActive: true }); languageId = language._id.toString();
  const voice = await Voice.create({ languageId: language._id, provider: 'openai', providerVoiceId: 'alloy', name: 'Test Voice', gender: 'NEUTRAL', description: 'Test-owned voice', isActive: true }); voiceId = voice._id.toString();
  const project = await Project.create({ userId: customerId, name: `S24 Project ${suffix}`, description: 'test-owned', sourceLanguage: language.code, status: 'UPLOADED', progress: 10 }); projectId = project._id.toString();
  await Media.create({ projectId: project._id, originalName: 'sample.mp4', fileName: 'server.mp4', mediaType: 'VIDEO', mimeType: 'video/mp4', fileSize: 100, storagePath: `tests/${suffix}/server.mp4` });
  const job = await ProcessingJob.create({ projectId: project._id, type: 'TRANSCRIPTION', status: 'FAILED', progress: 20, errorMessage: 'SAFE_TEST_ERROR' }); jobId = job._id.toString();
  await ActivityLog.create({ userId: customerId, action: 'S24_TEST_ACTION', entityType: 'Project', entityId: project._id, description: 'S24 test activity' });
});

after(async () => {
  const users = await User.find({ email: { $in: emails } }).select('_id'); const userIds = users.map((user) => user._id); const projects = await Project.find({ userId: { $in: userIds } }).select('_id'); const projectIds = projects.map((project) => project._id);
  await Promise.all([AuthSession.deleteMany({ userId: { $in: userIds } }), ActivityLog.deleteMany({ $or: [{ userId: { $in: userIds } }, { entityId: { $in: projectIds } }] }), ProcessingJob.deleteMany({ projectId: { $in: projectIds } }), Media.deleteMany({ projectId: { $in: projectIds } }), Project.deleteMany({ _id: { $in: projectIds } }), Voice.deleteMany({ _id: voiceId }), Language.deleteMany({ _id: languageId })]);
  await User.deleteMany({ _id: { $in: userIds } }); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await disconnectDatabase();
});

test('S24.1 voice catalog and Admin APIs', async (t) => {
  await t.test('voice catalog requires authentication and CUSTOMER role', async () => { assert.equal((await request('/api/voices')).status, 401); assert.equal((await request('/api/voices', adminToken)).status, 403); assert.equal((await request('/api/voices', blockedToken)).status, 403); });
  await t.test('voice catalog returns active real records and safe DTOs', async () => { const languageCode = (await Language.findById(languageId))?.code; const result = await request(`/api/voices?language=${languageCode}`, customerToken); assert.equal(result.status, 200); const payload = data(result); const voices = payload.voices as Array<Record<string, unknown>>; assert.equal(voices.length, 1); assert.equal(voices[0]?.id, voiceId); const serialized = JSON.stringify(payload); assert.doesNotMatch(serialized, /providerVoiceId|passwordHash|storagePath/i); });
  await t.test('voice catalog empty filter is honest', async () => { const result = await request('/api/voices?language=zzz', customerToken); assert.equal(result.status, 200); assert.deepEqual(data(result).voices, []); assert.deepEqual(data(result).languages, []); });
  await t.test('all Admin routes reject unauthenticated and CUSTOMER access', async () => { for (const path of ['/api/admin/dashboard', '/api/admin/users', '/api/admin/projects', '/api/admin/jobs', '/api/admin/languages', '/api/admin/voices', '/api/admin/logs', '/api/admin/settings']) { assert.equal((await request(path)).status, 401, path); assert.equal((await request(path, customerToken)).status, 403, path); } });
  await t.test('blocked Admin token is rejected', async () => { await User.updateOne({ _id: adminId }, { status: 'BLOCKED' }); assert.equal((await request('/api/admin/dashboard', adminToken)).status, 403); await User.updateOne({ _id: adminId }, { status: 'ACTIVE' }); });
  await t.test('dashboard uses real aggregates without secrets', async () => { const result = await request('/api/admin/dashboard', adminToken); assert.equal(result.status, 200); const payload = data(result); assert.ok((payload.stats as { totalCustomers: number }).totalCustomers >= 3); assert.doesNotMatch(JSON.stringify(payload), /passwordHash|refreshToken|storagePath|JWT_|OPENAI_API_KEY/i); });
  await t.test('users support search, filter and pagination', async () => { const result = await request(`/api/admin/users?search=${encodeURIComponent('Khách S24')}&status=ACTIVE&page=1&limit=1`, adminToken); assert.equal(result.status, 200); const payload = data(result); assert.equal((payload.items as unknown[]).length, 1); assert.equal((payload.pagination as { limit: number }).limit, 1); assert.doesNotMatch(JSON.stringify(payload), /passwordHash|refreshToken/i); });
  await t.test('user detail and status management are CUSTOMER-only', async () => { assert.equal((await request(`/api/admin/users/${customerId}`, adminToken)).status, 200); const invalid = await request(`/api/admin/users/${customerId}/status`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'ADMIN', role: 'ADMIN' }) }); assert.equal(invalid.status, 400); const adminChange = await request(`/api/admin/users/${adminId}/status`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'BLOCKED' }) }); assert.equal(adminChange.status, 400); assert.equal((adminChange.body?.error as { code: string }).code, 'ADMIN_SELF_UPDATE_FORBIDDEN'); assert.equal((await User.findById(adminId))?.status, 'ACTIVE'); });
  await t.test('blocking a customer revokes sessions and unblocking works', async () => { const blocked = await request(`/api/admin/users/${secondId}/status`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'BLOCKED' }) }); assert.equal(blocked.status, 200); assert.equal((await User.findById(secondId))?.status, 'BLOCKED'); assert.equal(await AuthSession.countDocuments({ userId: secondId }), 0); const active = await request(`/api/admin/users/${secondId}/status`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE' }) }); assert.equal(active.status, 200); });
  await t.test('projects list/detail expose safe metadata and support filters', async () => { const list = await request(`/api/admin/projects?search=${encodeURIComponent(suffix)}&mediaType=VIDEO&page=1&limit=5`, adminToken); assert.equal(list.status, 200); assert.equal((data(list).items as unknown[]).length, 1); assert.doesNotMatch(JSON.stringify(data(list)), /storagePath/i); const detail = await request(`/api/admin/projects/${projectId}`, adminToken); assert.equal(detail.status, 200); });
  await t.test('jobs list/detail support status, type and search', async () => { const list = await request(`/api/admin/jobs?type=TRANSCRIPTION&status=FAILED&search=${jobId}`, adminToken); assert.equal(list.status, 200); assert.ok((data(list).items as unknown[]).length >= 1); assert.equal((await request(`/api/admin/jobs/${jobId}`, adminToken)).status, 200); });
  await t.test('languages and voices return persisted catalog only', async () => { const languages = await request(`/api/admin/languages?search=${encodeURIComponent('Test Language')}`, adminToken); assert.equal(languages.status, 200); assert.ok((data(languages).languages as unknown[]).length >= 1); const voices = await request(`/api/admin/voices?languageId=${languageId}&isActive=true`, adminToken); assert.equal(voices.status, 200); assert.equal((data(voices).voices as Array<{ id: string }>)[0]?.id, voiceId); });
  await t.test('logs are read-only, searchable and paginated', async () => { const result = await request('/api/admin/logs?action=S24_TEST_ACTION&page=1&limit=5', adminToken); assert.equal(result.status, 200); assert.ok((data(result).items as unknown[]).length >= 1); assert.doesNotMatch(JSON.stringify(data(result)), /passwordHash|tokenHash|storagePath/i); });
  await t.test('settings are safe and explicitly read-only', async () => { const result = await request('/api/admin/settings', adminToken); assert.equal(result.status, 200); const settings = data(result).settings as { editable: boolean }; assert.equal(settings.editable, false); assert.doesNotMatch(JSON.stringify(settings), /secret|apiKey|mongoUri|corsOrigins/i); assert.equal((await request('/api/admin/settings', adminToken, { method: 'PATCH', body: '{}' })).status, 404); });
  await t.test('invalid ids, pagination and filters are controlled', async () => { assert.equal((await request('/api/admin/users/not-an-id', adminToken)).status, 400); assert.equal((await request('/api/admin/projects?page=0', adminToken)).status, 400); assert.equal((await request('/api/admin/jobs?status=UNKNOWN', adminToken)).status, 400); });
  await t.test('monitoring endpoints expose no destructive project/job mutation', async () => { assert.equal((await request(`/api/admin/projects/${projectId}`, adminToken, { method: 'DELETE' })).status, 404); assert.equal((await request(`/api/admin/jobs/${jobId}`, adminToken, { method: 'DELETE' })).status, 404); assert.ok(await Project.exists({ _id: projectId })); assert.ok(await ProcessingJob.exists({ _id: jobId })); });
});
