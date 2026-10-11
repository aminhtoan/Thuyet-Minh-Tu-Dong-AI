import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import express from 'express';
import multer from 'multer';
import { Types } from 'mongoose';

const directory = await mkdtemp(join(tmpdir(), 'narration-filename-test-'));
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = directory;
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/filename_unit_test';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
const { uploadMedia } = await import('../src/middleware/upload.middleware.js');
const mediaService = await import('../src/services/media.service.js');
const { Media } = await import('../src/models/Media.js');
const { Project } = await import('../src/models/Project.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');

test('UTF-8 filename survives real multipart parser, mock persistence and API reload', async (t) => {
  const projectId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  let stored: any = null;
  t.mock.method(Media, 'findOne', async () => stored);
  t.mock.method(Media, 'findOneAndUpdate', async (_filter: unknown, update: any) => {
    stored = new Media({ _id: new Types.ObjectId(), projectId, ...update.$set, createdAt: new Date(), updatedAt: new Date() });
    await stored.validate();
    return stored;
  });
  t.mock.method(Project, 'updateOne', async () => ({}));
  t.mock.method(ActivityLog, 'create', async () => ({}));
  const app = express();
  app.post('/baseline', multer({ storage: multer.memoryStorage() }).single('file'), (request, response) => response.json({ name: request.file?.originalname }));
  app.post('/media', (request, _response, next) => { request.ownedProjectId = projectId; next(); }, uploadMedia, async (request, response) => {
    assert.ok(request.file);
    response.json({ media: await mediaService.upload(projectId, userId, request.file) });
  });
  app.get('/media', async (_request, response) => response.json({ media: await mediaService.get(projectId) }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const send = async (path: string, name: string) => {
    const form = new FormData(); form.append('file', new Blob(['synthetic media bytes'], { type: name.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg' }), name);
    const response = await fetch(base + path, { method: 'POST', body: form });
    assert.equal(response.status, 200); return await response.json() as any;
  };
  try {
    await t.test('reproduces default latin1 parser mojibake before fix', async () => {
      const name = 'giới thiệu.mp3';
      assert.equal((await send('/baseline', name)).name, Buffer.from(name, 'utf8').toString('latin1'));
    });
    for (const name of ['gioi-thieu.mp3', 'giới thiệu.mp3', 'thuyết minh tiếng Việt.mp3', 'âm thanh thử nghiệm.mp3', 'Tên Unicode 日本語 🎵 50% café.mp3', 'a\u0302m thanh.mp3', 'literal Ã©.mp3', 'video giới thiệu.mp4']) {
      await t.test(name, async () => {
        const uploaded = await send('/media', name);
        assert.equal(uploaded.media.originalName, name);
        assert.equal(stored.originalName, name);
        assert.match(stored.fileName, /^[\da-f-]{36}\.(mp3|mp4)$/);
        assert.notEqual(stored.fileName, name);
        assert.equal((await readFile(join(directory, stored.storagePath))).toString(), 'synthetic media bytes');
        const reloaded = await (await fetch(base + '/media')).json() as any;
        assert.equal(reloaded.media.originalName, name);
        assert.equal('storagePath' in reloaded.media, false);
        assert.equal('fileName' in reloaded.media, false);
      });
    }
    await t.test('explicit header charset is respected rather than decoded twice', async () => {
      const boundary = 'filename-charset-test';
      const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename*=iso-8859-1''caf%E9.mp3\r\nContent-Type: audio/mpeg\r\n\r\nfixture\r\n--${boundary}--\r\n`;
      const response = await fetch(base + '/media', { method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body });
      assert.equal(response.status, 200);
      assert.equal(((await response.json()) as any).media.originalName, 'café.mp3');
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    // Only the unique mkdtemp directory created by this test, never dev uploads.
    await rm(directory, { recursive: true, force: true });
  }
});
