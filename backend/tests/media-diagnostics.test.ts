import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FfmpegMediaProcessor, runMediaCommand } from '../src/services/media-processing/ffmpeg-media-processor.js';
import { MediaProcessingError, processingFailure, sanitizeProcessingStderr } from '../src/services/media-processing/processing-diagnostics.js';

const probe = (video = true, audio = true, videoCodec = 'h264') => JSON.stringify({ format: { duration: '2', size: '4', format_name: 'mov,mp4' }, streams: [...(video ? [{ codec_type: 'video', codec_name: videoCodec, width: 32, height: 32 }] : []), ...(audio ? [{ codec_type: 'audio', codec_name: 'aac' }] : [])] });
test('safe stderr is bounded and excludes paths, account data, credentials and input metadata', () => {
  const key = process.env.S30_DIAGNOSTIC_API_KEY; process.env.S30_DIAGNOSTIC_API_KEY = 'fixture-secret-value';
  try {
    const text = sanitizeProcessingStderr('Metadata: private transcript\nError opening C:\\users\\private\\source.mp4\nError https://private.invalid/key fixture-secret-value Bearer token-value a@example.invalid\nInvalid argument ' + 'x'.repeat(3000));
    assert.ok(text.length <= 2000); assert.doesNotMatch(text, /private transcript|fixture-secret-value|token-value|example.invalid|source.mp4|https:/);
  } finally { if (key === undefined) delete process.env.S30_DIAGNOSTIC_API_KEY; else process.env.S30_DIAGNOSTIC_API_KEY = key; }
});
test('persistence failures retain stage without logging raw database exception details', () => {
  assert.deepEqual(processingFailure(new Error('private Mongo URI'), 'PERSIST_RESULT', 12), { stage: 'PERSIST_RESULT', code: 'MEDIA_PROCESSING_FAILED', durationMs: 12 });
  assert.equal(processingFailure(new Error('MEDIA_PROCESSING_SOURCE_CHANGED'), 'PERSIST_RESULT', 10).code, 'MEDIA_PROCESSING_SOURCE_CHANGED');
});
test('probe rejects malformed JSON, empty or nonfinite duration/size', async () => {
  for (const stdout of ['not json', '{}', JSON.stringify({ format: { duration: 'Infinity', size: '1' } }), JSON.stringify({ format: { duration: '2', size: '0' } })]) {
    const processor = new FfmpegMediaProcessor(async () => ({ stdout, stderr: '' }));
    await assert.rejects(processor.probe('fixture'), error => error instanceof MediaProcessingError && error.diagnostics.stage === 'PROBE');
  }
});
test('composition uses argument arrays with Unicode/space paths and validates H264/AAC output', async () => {
  const dir = await mkdtemp(join(tmpdir(), 's30-unit-')), output = join(dir, 'Kết quả.mp4');
  const stages: string[] = [];
  try {
    const processor = new FfmpegMediaProcessor(async (_binary, args, stage) => {
      stages.push(stage);
      if (stage === 'RENDER') { assert.ok(args.includes('C:\\Nguồn video\\bảo tàng.mp4')); assert.ok(args.includes('C:\\Thuyết minh\\English.mp3')); assert.ok(args.includes('aac')); assert.ok(args.includes('libx264')); assert.ok(args.includes('-nostdin')); await writeFile(output, new Uint8Array([1, 2, 3, 4])); }
      return { stdout: probe(), stderr: '' };
    });
    const result = await processor.composeNarration({ sourceVideoPath: 'C:\\Nguồn video\\bảo tàng.mp4', narrationAudioPath: 'C:\\Thuyết minh\\English.mp3', outputPath: output });
    assert.equal(result.videoCodec, 'h264'); assert.equal(result.audioCodec, 'aac'); assert.equal(result.mimeType, 'video/mp4');
    assert.deepEqual(stages, ['PROBE_SOURCE', 'PROBE_NARRATION', 'RENDER', 'PROBE_OUTPUT']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('missing source video or narration audio rejects before render', async () => {
  for (const broken of ['PROBE_SOURCE', 'PROBE_NARRATION']) {
    let renders = 0;
    const processor = new FfmpegMediaProcessor(async (_binary, _args, stage) => { if (stage === 'RENDER') renders++; return { stdout: stage === broken ? probe(false, false) : probe(), stderr: '' }; });
    await assert.rejects(processor.composeNarration({ sourceVideoPath: 'source', narrationAudioPath: 'audio', outputPath: 'unused' }), error => error instanceof MediaProcessingError && error.diagnostics.stage === 'VALIDATE_INPUT');
    assert.equal(renders, 0);
  }
});
test('missing/empty/wrong-codec output cannot be accepted', async () => {
  const dir = await mkdtemp(join(tmpdir(), 's30-invalid-'));
  try { for (const mode of ['missing', 'empty', 'codec']) {
    const output = join(dir, mode + '.mp4');
    const processor = new FfmpegMediaProcessor(async (_binary, _args, stage) => { if (stage === 'RENDER' && mode !== 'missing') await writeFile(output, mode === 'empty' ? '' : 'fixture'); return { stdout: stage === 'PROBE_OUTPUT' && mode === 'codec' ? probe(true, true, 'mpeg4') : probe(), stderr: '' }; });
    await assert.rejects(processor.composeNarration({ sourceVideoPath: 'source', narrationAudioPath: 'audio', outputPath: output }), error => error instanceof MediaProcessingError && error.diagnostics.stage === 'VALIDATE_OUTPUT');
  } } finally { await rm(dir, { recursive: true, force: true }); }
});
test('real child runner success/nonzero/spawn failure/timeout have structured bounded diagnostics', async () => {
  const value = await runMediaCommand(process.execPath, ['-e', 'process.stdout.write("ok")'], 'RENDER'); assert.equal(value.stdout, 'ok');
  await assert.rejects(runMediaCommand(process.execPath, ['-e', 'process.stderr.write("Error invalid encoder");process.exit(7)'], 'RENDER'), error => error instanceof MediaProcessingError && error.diagnostics.exitCode === 7 && error.diagnostics.stderr?.includes('invalid encoder') === true);
  await assert.rejects(runMediaCommand(join(tmpdir(), 's30-binary-that-does-not-exist'), [], 'PROBE_SOURCE'), error => error instanceof MediaProcessingError && error.diagnostics.code === 'FFMPEG_NOT_AVAILABLE');
  const old = process.env.FFMPEG_TIMEOUT_MS; process.env.FFMPEG_TIMEOUT_MS = '40';
  try { await assert.rejects(runMediaCommand(process.execPath, ['-e', 'setInterval(()=>{},1000)'], 'RENDER'), error => error instanceof MediaProcessingError && error.diagnostics.code === 'MEDIA_PROCESSING_TIMEOUT'); }
  finally { if (old === undefined) delete process.env.FFMPEG_TIMEOUT_MS; else process.env.FFMPEG_TIMEOUT_MS = old; }
});
