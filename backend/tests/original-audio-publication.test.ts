import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Types } from 'mongoose';

const directory = await mkdtemp(join(tmpdir(), 'original-publication-fixture-'));
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = directory;
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused_original_audio_mock';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
const { Project } = await import('../src/models/Project.js');
const { Media } = await import('../src/models/Media.js');
const { PublishedOriginalAudio } = await import('../src/models/PublishedOriginalAudio.js');
const { originalIsPublic, reviewTransition } = await import('../src/services/original-audio-policy.js');
const { sourceFingerprint, fileDigest } = await import('../src/services/original-audio-artifact.js');
const service = await import('../src/services/original-audio.service.js');
const { originalRequestSchema, originalReviewSchema } = await import('../src/routes/original-audio.routes.js');

test('original publication policy and state transitions fail closed', () => {
  const ownerId = new Types.ObjectId(), mediaId = new Types.ObjectId();
  const item = { projectId: new Types.ObjectId(), ownerId, sourceMediaId: mediaId, sourceFingerprint: 'source',
    authorizationMode: 'ADMIN_DIRECT', publicationEnabled: true,
    languageCode: 'vi', artifactStatus: 'READY', publicationStatus: 'APPROVED', artifactPath: 'independent.mp3',
    artifactDigest: 'a'.repeat(64), mimeType: 'audio/mpeg', fileSize: 10, duration: 2,
    rightsDeclaration: 'Owner grants publication', rightsReference: 'licence reference', rightsDeclaredAt: new Date(),
    reviewedBy: new Types.ObjectId(), reviewedAt: new Date() };
  const current = { ownerId, mediaId, fingerprint: 'source' };
  assert.equal(originalIsPublic(item, current), true);
  for (const patch of [{ artifactStatus: 'PENDING' }, { publicationStatus: 'PENDING' }, { publicationStatus: 'REVOKED' },
    { publicationStatus: 'REJECTED' }, { publicationEnabled: false }, { authorizationMode: undefined }, { reviewedBy: undefined },
    { artifactDigest: '' }, { artifactPath: '' }, { duration: 0 }]) assert.equal(originalIsPublic({ ...item, ...patch }, current), false);
  assert.equal(originalIsPublic(item, null), false);
  assert.equal(originalIsPublic(item, { ...current, fingerprint: 'changed' }), false);
  assert.equal(originalIsPublic(item, { ...current, ownerId: new Types.ObjectId() }), false);
  assert.equal(reviewTransition('PENDING', 'APPROVED'), true);
  assert.equal(reviewTransition('APPROVED', 'REVOKED'), true);
  assert.equal(reviewTransition('REVOKED', 'APPROVED'), false);
  assert.equal(reviewTransition('PENDING', 'REVOKED'), false);
});

test('owner cannot assign approval fields and rights confirmation is mandatory', () => {
  const params = { projectId: new Types.ObjectId().toString() };
  const body = { confirmsPublicationRights: true, declaration: 'I declare rights to publish this audio.', reference: 'Licence document REF-1' };
  assert.equal(originalRequestSchema.safeParse({ params, body }).success, true);
  for (const patch of [{ confirmsPublicationRights: false }, { reference: '' }, { publicationStatus: 'APPROVED' }, { artifactPath: 'source.mp3' }, { ownerId: 'other' }]) {
    assert.equal(originalRequestSchema.safeParse({ params, body: { ...body, ...patch } }).success, false);
  }
  assert.equal(originalReviewSchema.safeParse({ params: { id: params.projectId }, body: { action: 'APPROVED', reason: 'Reviewed licence reference', version: 0 } }).success, true);
});

test('mock repository: ownership, preparation, review CAS, listing, playback and revocation', async t => {
  const ownerId = new Types.ObjectId(), projectId = new Types.ObjectId(), mediaId = new Types.ObjectId();
  const project = { _id: projectId, userId: ownerId, sourceLanguageStatus: 'CONFIRMED', sourceLanguage: 'vi' };
  const media = { _id: mediaId, updatedAt: new Date(), storagePath: 'synthetic-source.bin' };
  await writeFile(join(directory, media.storagePath), 'synthetic source only');
  const digest = await fileDigest(media.storagePath);
  let item = new PublishedOriginalAudio({ projectId, ownerId, sourceMediaId: mediaId, sourceFingerprint: sourceFingerprint(media, digest.digest),
    authorizationMode: 'ADMIN_DIRECT', publicationEnabled: true,
    languageCode: 'vi', rightsDeclaration: 'I own publication rights.', rightsReference: 'Fixture licence REF-1', rightsDeclaredAt: new Date(), requestedAt: new Date() });
  t.mock.method(Project, 'exists', async (filter: Record<string, unknown>) => !filter.userId || String(filter.userId) === String(ownerId) ? { _id: projectId } : null);
  t.mock.method(Project, 'findById', async () => project as never);
  t.mock.method(Media, 'findOne', async () => media as never);
  t.mock.method(PublishedOriginalAudio, 'findById', async () => item);
  t.mock.method(PublishedOriginalAudio, 'findOne', async (filter: Record<string, unknown>) => filter.version === item.version && item.publicationStatus === 'APPROVED' ? item : null);
  t.mock.method(PublishedOriginalAudio, 'find', () => ({ sort: () => ({ limit: async () => [item] }) }) as never);
  let loseReadyAcknowledgement = false;
  t.mock.method(PublishedOriginalAudio, 'findOneAndUpdate', async (filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) => {
    if (filter.version !== item.version || filter.publicationStatus !== item.publicationStatus) return null;
    item.set(update.$set); item.version++;
    if (loseReadyAcknowledgement && update.$set.artifactStatus === 'READY') throw Error('simulated lost database acknowledgement');
    return item;
  });
  t.mock.method(PublishedOriginalAudio, 'updateOne', async (filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) => {
    if (item.artifactStatus === filter.artifactStatus && item.preparationId === filter.preparationId) { item.set(update.$set); item.version++; }
    return { acknowledged: true, modifiedCount: 1 } as never;
  });
  t.mock.method(PublishedOriginalAudio, 'create', async (value: Record<string, unknown>) => new PublishedOriginalAudio(value) as never);
  await assert.rejects(service.requestOriginalPublication(String(projectId), String(new Types.ObjectId()), { declaration: 'I own publication rights.', reference: 'Fixture licence REF-1' }));
  await assert.rejects(service.listOriginalRequests(String(projectId), String(new Types.ObjectId())));
  const request = await service.requestOriginalPublication(String(projectId), String(ownerId), { declaration: 'I own publication rights.', reference: 'Fixture licence REF-1' });
  assert.equal(request.publicationStatus, 'PENDING');
  assert.deepEqual(await service.listPublicOriginalAudio(), []);
  await assert.rejects(service.readPublicOriginalAudio(String(item._id)));
  const sourceBefore = await fileDigest(media.storagePath);
  let release: (() => void) | undefined;
  let entered: (() => void) | undefined;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const preparing = service.prepareOriginalArtifact(String(item._id), { prepare: async (source, destination) => {
    entered!(); await waiting;
    assert.notEqual(source, destination);
    await mkdir(join(destination, '..'), { recursive: true });
    await writeFile(destination, 'mock independent MP3');
    return { duration: 2, mimeType: 'audio/mpeg' };
  } });
  await started;
  await assert.rejects(service.prepareOriginalArtifact(String(item._id), { prepare: async () => { throw Error('must not start concurrently'); } }));
  release!(); await preparing;
  await assert.rejects(service.prepareOriginalArtifact(String(item._id), { prepare: async () => { throw Error('must not overwrite READY'); } }));
  assert.equal((await fileDigest(media.storagePath)).digest, sourceBefore.digest);
  await assert.rejects(service.reviewOriginalPublication(String(item._id), String(ownerId), { action: 'APPROVED', reason: 'Self approval denied', version: item.version }));
  const version = item.version;
  const adminId = String(new Types.ObjectId());
  await service.reviewOriginalPublication(String(item._id), adminId, { action: 'APPROVED', reason: 'Licence checked REF-1', version });
  assert.equal(String(item.reviewedBy), adminId); assert.ok(item.reviewedAt);
  const listing = await service.listPublicOriginalAudio();
  assert.equal(listing.length, 1);
  assert.doesNotMatch(JSON.stringify(listing), /artifactPath|rightsReference|storagePath|ownerId|synthetic-source|published-original\//);
  assert.equal((await service.readPublicOriginalAudio(String(item._id))).toString(), 'mock independent MP3');
  await writeFile(join(directory, item.artifactPath!), 'tampered artifact');
  assert.deepEqual(await service.listPublicOriginalAudio(), []);
  await assert.rejects(service.readPublicOriginalAudio(String(item._id)));
  await writeFile(join(directory, item.artifactPath!), 'mock independent MP3');
  // A stale concurrent review cannot restore approval or overwrite the current version.
  await assert.rejects(service.reviewOriginalPublication(String(item._id), adminId, { action: 'REVOKED', reason: 'Stale concurrent action', version }));
  const previousDate = media.updatedAt;
  await writeFile(join(directory, media.storagePath), 'source bytes changed without changing filename');
  assert.deepEqual(await service.listPublicOriginalAudio(), []);
  await assert.rejects(service.readPublicOriginalAudio(String(item._id)));
  await writeFile(join(directory, media.storagePath), 'synthetic source only');
  media.updatedAt = new Date(previousDate.getTime() + 1);
  assert.deepEqual(await service.listPublicOriginalAudio(), []);
  await assert.rejects(service.readPublicOriginalAudio(String(item._id)));
  media.updatedAt = previousDate;
  await service.reviewOriginalPublication(String(item._id), adminId, { action: 'REVOKED', reason: 'Rights withdrawn by owner', version: item.version });
  await assert.rejects(service.reviewOriginalPublication(String(item._id), adminId, { action: 'APPROVED', reason: 'Cannot restore revoked review', version: item.version }));
  assert.deepEqual(await service.listPublicOriginalAudio(), []);
  await assert.rejects(service.readPublicOriginalAudio(String(item._id)));
  // Reset only the mock fixture, never runtime data, to exercise failed extraction/retry.
  item.publicationStatus = 'PENDING'; item.artifactStatus = 'PENDING'; item.version++;
  await assert.rejects(service.prepareOriginalArtifact(String(item._id), { prepare: async (_source, destination) => {
    await writeFile(destination, 'partial output'); throw Error('simulated process failure');
  } }));
  assert.equal(item.artifactStatus, 'FAILED');
  assert.equal(item.preparationErrorCode, 'ORIGINAL_AUDIO_PREPARATION_FAILED');
  assert.deepEqual(await service.listPublicOriginalAudio(), []);
  assert.equal((await readdir(join(directory, 'published-original', String(item._id)))).some(name => name.includes('.partial.')), false);
  const dateBeforeExtraction = media.updatedAt;
  await assert.rejects(service.prepareOriginalArtifact(String(item._id), { prepare: async (_source, destination) => {
    await writeFile(destination, 'synthetic independent audio'); media.updatedAt = new Date(dateBeforeExtraction.getTime() + 500);
    return { duration: 2, mimeType: 'audio/mpeg' };
  } }));
  assert.equal(item.preparationErrorCode, 'ORIGINAL_AUDIO_SOURCE_CHANGED');
  media.updatedAt = dateBeforeExtraction;
  // Mutate only a synthetic temp file between initial digest and final publication.
  let tamperPath: string | undefined;
  t.mock.method(Media, 'findOne', async () => {
    if (tamperPath) { const path = tamperPath; tamperPath = undefined; await writeFile(path, 'changed after first digest'); }
    return media as never;
  });
  await assert.rejects(service.prepareOriginalArtifact(String(item._id), { prepare: async (_source, destination) => {
    await writeFile(destination, 'original fixture artifact'); tamperPath = destination;
    return { duration: 2, mimeType: 'audio/mpeg' };
  } }));
  assert.equal(item.preparationErrorCode, 'ORIGINAL_AUDIO_DIGEST_MISMATCH');
  // Persisted READY with a lost response must retain the referenced artifact, never delete it.
  loseReadyAcknowledgement = true;
  await assert.rejects(service.prepareOriginalArtifact(String(item._id), { prepare: async (_source, destination) => {
    await writeFile(destination, 'successfully persisted artifact'); return { duration: 2, mimeType: 'audio/mpeg' };
  } }));
  assert.equal(item.artifactStatus, 'READY');
  assert.equal((await fileDigest(item.artifactPath!)).digest, item.artifactDigest);
  assert.equal(item.publicationStatus, 'PENDING');
  assert.deepEqual(await service.listPublicOriginalAudio(), []);
  item = new PublishedOriginalAudio(item.toObject());
});

test('HTTP foundation enforces authentication, roles, strict fields and foreign ownership with mocks', async t => {
  const { default: express } = await import('express');
  const { originalAudioRouter } = await import('../src/routes/original-audio.routes.js');
  const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
  const { signAccessToken } = await import('../src/utils/jwt.js');
  const { User } = await import('../src/models/User.js');
  const ownerId = new Types.ObjectId(), adminId = new Types.ObjectId(), projectId = new Types.ObjectId();
  t.mock.method(User, 'findOne', async (filter: Record<string, unknown>) => ({ _id: filter._id,
    role: String(filter._id) === String(adminId) ? 'ADMIN' : 'CUSTOMER', status: 'ACTIVE', fullName: 'Synthetic', email: 'fixture@example.test' }) as never);
  t.mock.method(Project, 'exists', async () => null);
  t.mock.method(PublishedOriginalAudio, 'findById', async () => new PublishedOriginalAudio({ projectId, ownerId: new Types.ObjectId() }));
  const app = express(); app.use(express.json()); app.use('/api/published-original-audio', originalAudioRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/published-original-audio`;
  const ownerToken = signAccessToken(String(ownerId), 'CUSTOMER');
  const adminToken = signAccessToken(String(adminId), 'ADMIN');
  const body = { confirmsPublicationRights: true, declaration: 'I declare the right to publish this audio.', reference: 'Synthetic reference document' };
  try {
    const request = (path: string, token?: string, payload?: object, method = 'POST') => fetch(base + path,
      { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
    assert.equal((await request(`/projects/${projectId}/requests`, undefined, body)).status, 401);
    assert.equal((await request(`/admin/projects/${projectId}/publication`, ownerToken, { enabled: true, sourceFingerprint: 'a'.repeat(64), version: null }, 'PATCH')).status, 403);
    assert.equal((await request(`/admin/projects/${projectId}/publication`, adminToken, { enabled: true, sourceFingerprint: 'a'.repeat(64), version: null, artifactPath: 'escape' }, 'PATCH')).status, 400);
    assert.equal((await request(`/projects/${projectId}/requests`, ownerToken, body)).status, 404);
    assert.equal((await request(`/projects/${projectId}/requests`, ownerToken, undefined, 'GET')).status, 404);
    assert.equal((await request(`/projects/${projectId}/requests`, adminToken, body)).status, 404);
    assert.equal((await request(`/${projectId}/prepare`, undefined, {})).status, 401);
    assert.equal((await request(`/${projectId}/prepare`, ownerToken, {})).status, 403);
    assert.equal((await request(`/${projectId}/prepare`, ownerToken, { artifactPath: 'escape' })).status, 403);
    assert.equal((await request(`/${projectId}/prepare`, adminToken, {})).status, 404);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test('Admin direct authorization: default off, exact revision, concurrent activation, ready, disable and stale source', async t => {
  const ownerId = new Types.ObjectId(), projectId = new Types.ObjectId(), adminId = String(new Types.ObjectId());
  const project = { _id: projectId, userId: ownerId, sourceLanguage: 'vi', sourceLanguageStatus: 'CONFIRMED' };
  const media = { _id: new Types.ObjectId(), storagePath: 'admin-synthetic.bin', updatedAt: new Date() };
  await writeFile(join(directory, media.storagePath), 'synthetic admin source');
  let record: InstanceType<typeof PublishedOriginalAudio> | null = null;
  t.mock.method(Project, 'findById', async () => project as never);
  t.mock.method(Media, 'findOne', async () => media as never);
  t.mock.method(PublishedOriginalAudio, 'init', async () => PublishedOriginalAudio);
  t.mock.method(PublishedOriginalAudio, 'find', () => ({ sort: () => ({ limit: async () => record ? [record] : [] }) }) as never);
  t.mock.method(PublishedOriginalAudio, 'findById', async () => record);
  t.mock.method(PublishedOriginalAudio, 'findOne', async (filter: Record<string, unknown>) => {
    if (!record || filter.version !== undefined && filter.version !== record.version
      || filter.publicationStatus !== undefined && filter.publicationStatus !== record.publicationStatus) return null;
    return record;
  });
  t.mock.method(PublishedOriginalAudio, 'create', async (value: Record<string, unknown>) => {
    if (record) throw Object.assign(Error('duplicate'), { code: 11000 });
    record = new PublishedOriginalAudio(value); return record as never;
  });
  t.mock.method(PublishedOriginalAudio, 'findOneAndUpdate', async (filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) => {
    if (!record || record.version !== filter.version || filter.publicationStatus !== undefined && filter.publicationStatus !== record.publicationStatus
      || filter.artifactStatus !== undefined && filter.artifactStatus !== record.artifactStatus) return null;
    record.set(update.$set); record.version++; return record;
  });
  t.mock.method(PublishedOriginalAudio, 'updateOne', async (filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) => {
    if (record && record.artifactStatus === filter.artifactStatus) { record.set(update.$set); record.version++; }
    return { acknowledged: true } as never;
  });
  const initial = await service.adminOriginalStatus(String(projectId));
  assert.equal(initial.enabled, false); assert.equal(initial.status, 'NOT_PUBLIC');
  await assert.rejects(service.setAdminOriginalPublication(String(projectId), adminId, { enabled: true, sourceFingerprint: 'a'.repeat(64), version: null }));
  let release!: () => void, announce!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; }), entered = new Promise<void>(resolve => { announce = resolve; });
  const activation = service.setAdminOriginalPublication(String(projectId), adminId,
    { enabled: true, sourceFingerprint: initial.sourceFingerprint, version: null }, { prepare: async (_source, output) => {
      announce(); await waiting; await writeFile(output, 'independent admin MP3'); return { duration: 2, mimeType: 'audio/mpeg' };
    } });
  await entered;
  assert.equal((await service.adminOriginalStatus(String(projectId))).status, 'PROCESSING');
  assert.deepEqual(await service.listPublicOriginalAudio(), []);
  await assert.rejects(service.setAdminOriginalPublication(String(projectId), adminId, { enabled: true, sourceFingerprint: initial.sourceFingerprint, version: null }));
  release(); const ready = await activation;
  assert.equal(ready.status, 'READY'); assert.equal(ready.enabled, true);
  assert.equal((await service.listPublicOriginalAudio()).length, 1);
  assert.ok(ready.publicationId);
  assert.equal((await service.readPublicOriginalAudio(ready.publicationId)).toString(), 'independent admin MP3');
  const disabled = await service.setAdminOriginalPublication(String(projectId), adminId, { enabled: false, sourceFingerprint: ready.sourceFingerprint, version: ready.version });
  assert.equal(disabled.status, 'DISABLED'); assert.deepEqual(await service.listPublicOriginalAudio(), []);
  await assert.rejects(service.readPublicOriginalAudio(ready.publicationId));
  const again = await service.setAdminOriginalPublication(String(projectId), adminId, { enabled: true, sourceFingerprint: disabled.sourceFingerprint, version: disabled.version });
  assert.equal(again.status, 'READY'); // reuse current artifact, no second extraction or approval
  const fixture = record as InstanceType<typeof PublishedOriginalAudio> | null;
  assert.ok(fixture); fixture.artifactStatus = 'FAILED';
  let releaseRetry!: () => void, announceRetry!: () => void;
  const retryWait = new Promise<void>(resolve => { releaseRetry = resolve; }), retryStarted = new Promise<void>(resolve => { announceRetry = resolve; });
  const retry = service.setAdminOriginalPublication(String(projectId), adminId,
    { enabled: true, sourceFingerprint: again.sourceFingerprint, version: again.version }, { prepare: async (_source, output) => {
      announceRetry(); await retryWait; await writeFile(output, 'retry fixture'); return { duration: 2, mimeType: 'audio/mpeg' };
    } });
  await retryStarted;
  const processing = await service.adminOriginalStatus(String(projectId));
  const offDuringProcessing = await service.setAdminOriginalPublication(String(projectId), adminId,
    { enabled: false, sourceFingerprint: processing.sourceFingerprint, version: processing.version });
  assert.equal(offDuringProcessing.status, 'DISABLED');
  const rejectedRetry = assert.rejects(retry);
  releaseRetry(); await rejectedRetry;
  assert.deepEqual(await service.listPublicOriginalAudio(), []);
  await assert.rejects(service.readPublicOriginalAudio(ready.publicationId));
  media.updatedAt = new Date(media.updatedAt.getTime() + 100);
  assert.equal((await service.adminOriginalStatus(String(projectId))).status, 'SOURCE_CHANGED');
  assert.deepEqual(await service.listPublicOriginalAudio(), []);
  await assert.rejects(service.readPublicOriginalAudio(ready.publicationId));
});

test.after(async () => { await rm(directory, { recursive: true, force: true }); });
