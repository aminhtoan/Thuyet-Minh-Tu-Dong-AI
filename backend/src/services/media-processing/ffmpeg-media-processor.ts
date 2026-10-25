import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import type { ComposeNarrationInput, MediaProcessingResult, MediaProcessor, MediaProbeResult } from './media-processor.interface.js';
import { MediaProcessingError, sanitizeProcessingStderr, type ProcessingStage } from './processing-diagnostics.js';

const MAX_STDERR = 16_384;
const timeoutMs = () => { const value = Number(process.env.FFMPEG_TIMEOUT_MS ?? 300_000); return Number.isFinite(value) && value > 0 ? value : 300_000; };

export const runMediaCommand = (binary: string, args: string[], stage: ProcessingStage): Promise<{ stdout: string; stderr: string }> => new Promise((resolve, reject) => {
  const started = Date.now();
  const child = spawn(binary, args, { shell: false, windowsHide: true }); let stdout = ''; let stderr = ''; let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs());
  child.stdout.on('data', (chunk: Buffer) => { stdout = (stdout + chunk.toString()).slice(-MAX_STDERR); });
  child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-MAX_STDERR); });
  child.on('error', (error: NodeJS.ErrnoException) => { clearTimeout(timer); reject(new MediaProcessingError({ stage, code: error.code === 'ENOENT' ? 'FFMPEG_NOT_AVAILABLE' : 'MEDIA_PROCESSING_FAILED', durationMs: Date.now() - started, systemCode: /^[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : undefined })); });
  child.on('close', (code, signal) => { clearTimeout(timer); if (timedOut || code !== 0) reject(new MediaProcessingError({ stage, code: timedOut ? 'MEDIA_PROCESSING_TIMEOUT' : 'MEDIA_PROCESSING_FAILED', exitCode: code, signal, durationMs: Date.now() - started, stderr: sanitizeProcessingStderr(stderr, [binary, ...args.filter(arg => arg.includes('/') || arg.includes('\\'))]) })); else resolve({ stdout, stderr }); });
});

export class FfmpegMediaProcessor implements MediaProcessor {
  constructor(private readonly command: typeof runMediaCommand = runMediaCommand) {}
  public async probe(inputPath: string, stage: ProcessingStage = 'PROBE'): Promise<MediaProbeResult> {
    const { stdout } = await this.command(process.env.FFPROBE_PATH?.trim() || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration,format_name,size', '-show_entries', 'stream=codec_type,codec_name,width,height', '-of', 'json', inputPath], stage);
    try {
      const value = JSON.parse(stdout) as { format?: { duration?: string; format_name?: string; size?: string }; streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }> };
      const duration = Number(value.format?.duration); const fileSize = Number(value.format?.size); const video = value.streams?.find((item) => item.codec_type === 'video');
      if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(fileSize) || fileSize <= 0) throw new Error();
      const audio = value.streams?.find(item => item.codec_type === 'audio');
      return { duration, format: value.format?.format_name ?? '', fileSize, hasVideo: Boolean(video), hasAudio: Boolean(audio), width: video?.width, height: video?.height, videoCodec: video?.codec_name, audioCodec: audio?.codec_name };
    } catch { throw new MediaProcessingError({ stage, code: 'MEDIA_PROCESSING_INVALID_OUTPUT', durationMs: 0 }); }
  }

  public async composeNarration(input: ComposeNarrationInput): Promise<MediaProcessingResult> {
    const source = await this.probe(input.sourceVideoPath, 'PROBE_SOURCE'); const narration = await this.probe(input.narrationAudioPath, 'PROBE_NARRATION');
    if (!source.hasVideo || !narration.hasAudio) throw new MediaProcessingError({ stage: 'VALIDATE_INPUT', code: 'MEDIA_PROCESSING_INVALID_OUTPUT', durationMs: 0 });
    await this.command(process.env.FFMPEG_PATH?.trim() || 'ffmpeg', ['-nostdin', '-y', '-i', input.sourceVideoPath, '-i', input.narrationAudioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-af', 'apad', '-t', String(source.duration), '-movflags', '+faststart', input.outputPath], 'RENDER');
    const output = await this.probe(input.outputPath, 'PROBE_OUTPUT');
    let size = 0; try { size = (await stat(input.outputPath)).size; } catch { /* Fail validation below. */ }
    if (!output.hasVideo || !output.hasAudio || output.videoCodec !== 'h264' || output.audioCodec !== 'aac' || !output.format.split(',').includes('mp4') || size <= 0) throw new MediaProcessingError({ stage: 'VALIDATE_OUTPUT', code: 'MEDIA_PROCESSING_INVALID_OUTPUT', durationMs: 0 });
    return { ...output, fileSize: size, mimeType: 'video/mp4' };
  }
}
