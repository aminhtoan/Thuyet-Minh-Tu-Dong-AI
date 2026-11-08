import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveMediaExecutable } from '../src/utils/media-executable.js';
import { FfmpegMediaProcessor } from '../src/services/media-processing/ffmpeg-media-processor.js';
import { wavToMp3 } from '../src/services/tts/gemini-tts.provider.js';

test('invalid configured paths fall back: synthetic WAV -> MP3 -> verified MP4, corrupt audio fails', async () => {
  const old = { ffmpeg: process.env.FFMPEG_PATH, ffprobe: process.env.FFPROBE_PATH };
  const dir = await mkdtemp(join(tmpdir(), 's39-synthetic-only-'));
  const run = promisify(execFile);
  process.env.FFMPEG_PATH = join(dir, 'missing-ffmpeg');
  process.env.FFPROBE_PATH = join(dir, 'missing-ffprobe');
  try {
    const ffmpeg = await resolveMediaExecutable('ffmpeg', process.env.FFMPEG_PATH);
    const ffprobe = await resolveMediaExecutable('ffprobe', process.env.FFPROBE_PATH);
    const source = join(dir, 'synthetic video.mp4'), wav = join(dir, 'synthetic.wav');
    const audio = join(dir, 'synthetic.mp3'), output = join(dir, 'synthetic result.mp4');
    await run(ffmpeg, ['-nostdin', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=64x96:d=1', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source], { timeout: 30000, windowsHide: true });
    await run(ffmpeg, ['-nostdin', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:a', 'pcm_s16le', wav], { timeout: 30000, windowsHide: true });
    const mp3 = await wavToMp3(await readFile(wav));
    assert.ok(mp3.length > 0);
    assert.notEqual(mp3.subarray(0, 4).toString(), 'RIFF');
    await writeFile(audio, mp3);
    const info = await run(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_name', '-of', 'json', audio], { timeout: 10000, windowsHide: true });
    assert.equal(JSON.parse(info.stdout).streams[0].codec_name, 'mp3');
    const result = await new FfmpegMediaProcessor().composeNarration({ sourceVideoPath: source, narrationAudioPath: audio, outputPath: output });
    assert.equal(result.videoCodec, 'h264');
    assert.equal(result.audioCodec, 'aac');
    await run(ffmpeg, ['-v', 'error', '-i', output, '-f', 'null', '-'], { timeout: 30000, windowsHide: true });
    await assert.rejects(wavToMp3(Buffer.from('not-an-audio-file')));
  } finally {
    for (const [key, value] of [['FFMPEG_PATH', old.ffmpeg], ['FFPROBE_PATH', old.ffprobe]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(dir, { recursive: true, force: true });
  }
});
