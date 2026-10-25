import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse } from 'dotenv';
import test from 'node:test';
import { FfmpegMediaProcessor } from '../src/services/media-processing/ffmpeg-media-processor.js';

test('real FFmpeg: Unicode/spaces, portrait H264 source + MP3 → verified H264/AAC MP4 and decode', async () => {
  // Only binary configuration; no database, SDK, transcription or TTS imports.
  const settings = parse(readFileSync(new URL('../.env', import.meta.url)));
  const previous = { ffmpeg: process.env.FFMPEG_PATH, ffprobe: process.env.FFPROBE_PATH };
  process.env.FFMPEG_PATH ||= settings.FFMPEG_PATH;
  process.env.FFPROBE_PATH ||= settings.FFPROBE_PATH;
  const binary = process.env.FFMPEG_PATH?.trim() || 'ffmpeg';
  const execute = promisify(execFile), dir = await mkdtemp(join(tmpdir(), 's30-ffmpeg-'));
  try {
    const unicode = join(dir, 'Bảo tàng có khoảng trắng'); await mkdir(unicode);
    const source = join(unicode, 'Video nguồn.mp4'), audio = join(unicode, 'Giọng đọc.mp3'), output = join(unicode, '.tmp-Kết quả.mp4');
    await execute(binary, ['-nostdin', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=64x96:d=2', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source], { windowsHide: true, timeout: 30_000 });
    await execute(binary, ['-nostdin', '-y', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=0.7', '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', audio], { windowsHide: true, timeout: 30_000 });
    const processor = new FfmpegMediaProcessor();
    const result = await processor.composeNarration({ sourceVideoPath: source, narrationAudioPath: audio, outputPath: output });
    assert.equal(result.videoCodec, 'h264'); assert.equal(result.audioCodec, 'aac');
    assert.equal(result.hasVideo, true); assert.equal(result.hasAudio, true); assert.ok(Math.abs(result.duration - 2) < 0.15);
    assert.ok(result.fileSize > 0);
    await execute(binary, ['-v', 'error', '-i', output, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], { windowsHide: true, timeout: 30_000 });
  } finally {
    assert.equal(dirname(resolve(dir)), resolve(tmpdir())); assert.ok(basename(dir).startsWith('s30-ffmpeg-'));
    await rm(dir, { recursive: true, force: true });
    if (previous.ffmpeg === undefined) delete process.env.FFMPEG_PATH; else process.env.FFMPEG_PATH = previous.ffmpeg;
    if (previous.ffprobe === undefined) delete process.env.FFPROBE_PATH; else process.env.FFPROBE_PATH = previous.ffprobe;
  }
});
