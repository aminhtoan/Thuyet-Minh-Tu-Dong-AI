import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, unlink, rmdir } from 'node:fs/promises';
import { join, isAbsolute, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
const exec = promisify(execFile);
export function storagePath(value) {
  if (!value || !isAbsolute(value)) throw Error('STAGING_UPLOAD_DIR_ABSOLUTE_REQUIRED');
  const path = resolve(value), rel = relative(resolve(tmpdir()), path);
  if (path === resolve(path, '..') || rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) throw Error('STAGING_UPLOAD_DIR_PERSISTENT_REQUIRED');
  return path;
}
export async function checkRuntime({ uploadDir, ffmpeg = 'ffmpeg', ffprobe = 'ffprobe' }) {
  const directory = storagePath(uploadDir);
  for (const [kind, binary] of [['ffmpeg', ffmpeg], ['ffprobe', ffprobe]]) {
    const { stdout } = await exec(binary, ['-version'], { timeout: 5000, windowsHide: true, maxBuffer: 65536 });
    if (!stdout.startsWith(kind + ' version ')) throw Error('STAGING_MEDIA_BINARY_INVALID');
  }
  const probe = await mkdtemp(join(directory, '.staging-check-'));
  const file = join(probe, 'probe');
  try {
    await writeFile(file, 'staging-storage-check', { flag: 'wx' });
    if (await readFile(file, 'utf8') !== 'staging-storage-check') throw Error('STAGING_STORAGE_READBACK_FAILED');
  } finally {
    await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(probe);
  }
}
export async function checkLocalHealth(port, fetcher = fetch) {
  const number = Number(port ?? 8080);
  if (!Number.isInteger(number) || number < 1 || number > 65535) throw Error('STAGING_PORT_INVALID');
  const response = await fetcher('http://127.0.0.1:' + number + '/api/health', { signal: AbortSignal.timeout(3000), redirect: 'error' });
  const body = await response.json();
  if (!response.ok || body?.success !== true || body.data?.database !== 'connected' || body.data?.status !== 'ok') throw Error('STAGING_DATABASE_NOT_READY');
}
