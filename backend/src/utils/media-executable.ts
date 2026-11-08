import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

type MediaBinary = 'ffmpeg' | 'ffprobe';
export type VerifyMediaBinary = (candidate: string, kind: MediaBinary) => Promise<boolean>;
const verify: VerifyMediaBinary = async (candidate, kind) => {
  try {
    const { stdout } = await promisify(execFile)(candidate, ['-version'], { timeout: 5000, maxBuffer: 64 * 1024, windowsHide: true });
    return stdout.startsWith(kind + ' version ');
  } catch { return false; }
};

// Never use a shell or retry an actual media operation. Only -version is probed.
export async function resolveMediaExecutable(kind: MediaBinary, configured?: string, check: VerifyMediaBinary = verify): Promise<string> {
  const candidate = configured?.trim();
  if (candidate && await check(candidate, kind)) return candidate;
  if (candidate !== kind && await check(kind, kind)) return kind;
  throw new Error(kind === 'ffmpeg' ? 'FFMPEG_NOT_AVAILABLE' : 'FFPROBE_NOT_AVAILABLE');
}
