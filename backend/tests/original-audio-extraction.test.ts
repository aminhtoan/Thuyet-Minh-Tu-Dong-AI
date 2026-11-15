import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'original-extraction-fixture-'));
process.env.NODE_ENV = 'test'; process.env.UPLOAD_DIR = directory;
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused_extraction_mock';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.FFMPEG_PATH = 'ffmpeg'; process.env.FFPROBE_PATH = 'ffprobe';
const { FfmpegOriginalAudioPreparer } = await import('../src/services/media-processing/original-audio-preparer.js');
const { FfmpegMediaProcessor, runMediaCommand } = await import('../src/services/media-processing/ffmpeg-media-processor.js');
const { MediaProcessingError } = await import('../src/services/media-processing/processing-diagnostics.js');
const { resolveMediaExecutable } = await import('../src/utils/media-executable.js');
const artifactRoot = join(directory, 'published-original', 'fixture');
await mkdir(artifactRoot, { recursive: true });
const input = join(directory, 'synthetic-source.bin'); await writeFile(input, 'not client MIME trusted');
const output = () => join(artifactRoot, `${randomBytes(8).toString('hex')}.partial.mp3`);

test('adapter command uses array arguments, MP3 audio-only profile and validates actual probes', async () => {
  const rendered: string[][] = [];
  let probeIndex = 0;
  const command: typeof runMediaCommand = async (_binary, args, stage) => {
    if (stage === 'RENDER') { rendered.push(args); await writeFile(args.at(-1)!, 'mock MP3'); return { stdout: '', stderr: '' }; }
    const isSource = ++probeIndex === 1;
    return { stdout: JSON.stringify({ format: { duration: '2', size: '8', format_name: isSource ? 'mov,mp4' : 'mp3' },
      streams: isSource ? [{ codec_type: 'video' }, { codec_type: 'audio', codec_name: 'aac' }] : [{ codec_type: 'audio', codec_name: 'mp3' }] }), stderr: '' };
  };
  const preparer = new FfmpegOriginalAudioPreparer(command, async kind => kind);
  assert.equal((await preparer.prepare(input, output())).mimeType, 'audio/mpeg');
  const args = rendered[0]!;
  for (const flag of ['-n', '-vn', '-sn', '-dn', 'libmp3lame', '48000', '2', '0:a:0']) assert.ok(args.includes(flag));
  assert.ok(!args.includes('-y'));
  assert.equal((await readFile(input)).toString(), 'not client MIME trusted');
});

test('no audio, unsupported source and invalid/corrupt output fail with no valid artifact', async () => {
  for (const mode of ['silent', 'unsupported', 'corrupt', 'video-output', 'wrong-codec', 'empty', 'long-output']) {
    const command: typeof runMediaCommand = async (_binary, args, stage) => {
      if (stage === 'RENDER') { await writeFile(args.at(-1)!, mode === 'empty' ? '' : 'fixture'); return { stdout: '', stderr: '' }; }
      if (stage === 'PROBE_OUTPUT' && mode === 'corrupt') return { stdout: '{bad', stderr: '' };
      const source = stage === 'PROBE_SOURCE';
      return { stdout: JSON.stringify({ format: { duration: !source && mode === 'long-output' ? '20' : '2', size: '8', format_name: source ? mode === 'unsupported' ? 'unknown' : 'mp4' : 'mp3' },
        streams: mode === 'silent' ? [{ codec_type: 'video' }] : [{ codec_type: 'audio', codec_name: !source && mode === 'wrong-codec' ? 'aac' : 'mp3' }, ...(!source && mode === 'video-output' ? [{ codec_type: 'video' }] : [])] }), stderr: '' };
    };
    await assert.rejects(new FfmpegOriginalAudioPreparer(command, async kind => kind).prepare(input, output()), MediaProcessingError);
  }
});

test('adapter blocks destination traversal and cancellation before spawning', async () => {
  let calls = 0;
  const command: typeof runMediaCommand = async () => { calls++; throw Error('unexpected'); };
  const preparer = new FfmpegOriginalAudioPreparer(command, async kind => kind);
  await assert.rejects(preparer.prepare(input, join(directory, 'escape.mp3')));
  await assert.rejects(preparer.prepare(input, join(artifactRoot, '..', '..', 'escape.partial.mp3')));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(preparer.prepare(input, output(), controller.signal));
  assert.equal(calls, 0);
});

test('shared process runner handles nonzero exit, timeout and cancellation with bounded lifetime', async () => {
  const code = (error: unknown, expected: string) => error instanceof MediaProcessingError && error.diagnostics.code === expected;
  await assert.rejects(runMediaCommand(process.execPath, ['-e', 'process.exit(3)'], 'RENDER'), e => code(e, 'MEDIA_PROCESSING_FAILED'));
  const priorTimeout = process.env.FFMPEG_TIMEOUT_MS; process.env.FFMPEG_TIMEOUT_MS = '50';
  try { await assert.rejects(runMediaCommand(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], 'RENDER'), e => code(e, 'MEDIA_PROCESSING_TIMEOUT')); }
  finally { if (priorTimeout === undefined) delete process.env.FFMPEG_TIMEOUT_MS; else process.env.FFMPEG_TIMEOUT_MS = priorTimeout; }
  const controller = new AbortController();
  const pending = runMediaCommand(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], 'RENDER', controller.signal);
  controller.abort();
  await assert.rejects(pending, e => code(e, 'MEDIA_PROCESSING_CANCELLED'));
});

test('installed FFmpeg extracts synthetic video/audio into independent validated MP3', async t => {
  let ffmpeg: string, ffprobe: string;
  try { ffmpeg = await resolveMediaExecutable('ffmpeg', 'ffmpeg'); ffprobe = await resolveMediaExecutable('ffprobe', 'ffprobe'); }
  catch { t.skip('FFmpeg/ffprobe not available; isolated runtime NOT VERIFIED'); return; }
  const version = await runMediaCommand(ffmpeg, ['-version'], 'RENDER');
  t.diagnostic(version.stdout.split('\n')[0]!);
  const processor = new FfmpegMediaProcessor((binary, args, stage) => runMediaCommand(stage.startsWith('PROBE') ? ffprobe : binary, args, stage));
  const preparer = new FfmpegOriginalAudioPreparer(runMediaCommand, async kind => kind === 'ffmpeg' ? ffmpeg : ffprobe);
  for (const kind of ['video', 'audio', 'silent']) {
    const source = join(directory, `synthetic-${kind}.${kind === 'audio' ? 'wav' : 'mp4'}`);
    const args = kind === 'audio' ? ['-f', 'lavfi', '-i', 'sine=frequency=660:duration=2', '-c:a', 'pcm_s16le']
      : ['-f', 'lavfi', '-i', 'color=c=blue:s=160x90:r=25:d=2', ...(kind === 'silent' ? ['-an'] : ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:a', 'aac']), '-c:v', 'libx264', '-pix_fmt', 'yuv420p'];
    await runMediaCommand(ffmpeg, ['-nostdin', '-n', ...args, source], 'RENDER');
    const before = await readFile(source), destination = output();
    if (kind === 'silent') { await assert.rejects(preparer.prepare(source, destination), e => e instanceof MediaProcessingError && e.diagnostics.code === 'ORIGINAL_AUDIO_NO_AUDIO_TRACK'); continue; }
    const metadata = await preparer.prepare(source, destination);
    const probe = await processor.probe(destination);
    assert.equal(probe.hasVideo, false); assert.equal(probe.audioCodec, 'mp3');
    assert.ok(Math.abs(metadata.duration - 2) <= 0.25);
    assert.deepEqual(await readFile(source), before);
    await runMediaCommand(ffmpeg, ['-v', 'error', '-i', destination, '-f', 'null', '-'], 'RENDER');
    t.diagnostic(`${kind}: MP3 duration=${metadata.duration.toFixed(3)}s; decode PASS; source unchanged`);
  }
  assert.ok((await readdir(directory)).every(name => !name.includes('uploads')));
});

test.after(async () => { await rm(directory, { recursive: true, force: true }); });
