import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, unlink, rmdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkRuntime, checkLocalHealth, storagePath } from './runtime-checks.mjs';

test('staging configuration rejects missing, relative, temporary and root storage', () => {
  for (const path of [undefined, '', 'uploads', tmpdir(), join(tmpdir(), 'uploads'), resolve('/')]) assert.throws(() => storagePath(path));
  assert.equal(storagePath(resolve('staging-volume')), resolve('staging-volume'));
});

test('real FFmpeg/FFprobe and storage probes preserve existing sentinel and clean own files only', async () => {
  // Only this newly minted workspace directory is used, never backend/uploads.
  const directory = await mkdtemp(resolve('../scratch/s37-ci-validation/staging-probe-'));
  const sentinel = join(directory, 'existing-media-sentinel');
  try {
    await writeFile(sentinel, 'unchanged');
    await checkRuntime({ uploadDir: directory });
    await checkRuntime({ uploadDir: directory });
    assert.equal(await readFile(sentinel, 'utf8'), 'unchanged');
    assert.deepEqual(await readdir(directory), ['existing-media-sentinel']);
    await assert.rejects(checkRuntime({ uploadDir: directory, ffmpeg: join(directory, 'missing-binary') }));
    await assert.rejects(checkRuntime({ uploadDir: join(directory, 'missing-storage') }));
  } finally { await unlink(sentinel); await rmdir(directory); }
});

test('database readiness checks only loopback with timeout; fake responses never connect to MongoDB', async () => {
  let calls = 0;
  await checkLocalHealth('8080', async (url, options) => {
    calls++; assert.equal(url, 'http://127.0.0.1:8080/api/health');
    assert.ok(options.signal); assert.equal(options.redirect, 'error');
    return Response.json({ success: true, data: { status: 'ok', database: 'connected' } });
  });
  assert.equal(calls, 1);
  for (const body of [{ success: true, data: { status: 'degraded', database: 'disconnected' } }, { success: true, data: { status: 'ok' } }, {}]) {
    await assert.rejects(checkLocalHealth(8080, async () => Response.json(body)), /DATABASE_NOT_READY/);
  }
  await assert.rejects(checkLocalHealth(8080, async () => { throw Error('OFFLINE'); }));
  await assert.rejects(checkLocalHealth('invalid', async () => { assert.fail('no fetch for bad port'); }));
});
