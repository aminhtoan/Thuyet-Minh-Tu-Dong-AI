import { checkLocalHealth, checkRuntime } from './runtime-checks.mjs';
try {
  await checkLocalHealth(process.env.PORT);
  await checkRuntime({ uploadDir: process.env.UPLOAD_DIR, ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg', ffprobe: process.env.FFPROBE_PATH || 'ffprobe' });
} catch {
  console.error('STAGING_HEALTHCHECK_FAILED');
  process.exitCode = 1;
}
