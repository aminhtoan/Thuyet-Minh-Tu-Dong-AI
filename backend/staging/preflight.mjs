import { checkRuntime } from './runtime-checks.mjs';
try {
  await checkRuntime({ uploadDir: process.env.UPLOAD_DIR, ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg', ffprobe: process.env.FFPROBE_PATH || 'ffprobe' });
} catch {
  console.error('STAGING_PREFLIGHT_FAILED: check absolute persistent UPLOAD_DIR, permissions and FFmpeg/FFprobe.');
  process.exit(1);
}
