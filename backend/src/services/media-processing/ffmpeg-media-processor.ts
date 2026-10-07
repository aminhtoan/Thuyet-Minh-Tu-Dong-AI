import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import type { ComposeNarrationInput, MediaProcessingResult, MediaProcessor, MediaProbeResult } from './media-processor.interface.js';

const MAX_STDERR = 16_384;
const timeoutMs = () => { const value = Number(process.env.FFMPEG_TIMEOUT_MS ?? 300_000); return Number.isFinite(value) && value > 0 ? value : 300_000; };

const run = (binary: string, args: string[]): Promise<{ stdout: string; stderr: string }> => new Promise((resolve, reject) => {
  const child = spawn(binary, args, { shell: false, windowsHide: true }); let stdout = ''; let stderr = ''; let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs());
  child.stdout.on('data', (chunk: Buffer) => { stdout = (stdout + chunk.toString()).slice(-MAX_STDERR); });
  child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-MAX_STDERR); });
  child.on('error', (error: NodeJS.ErrnoException) => { clearTimeout(timer); reject(new Error(error.code === 'ENOENT' ? 'FFMPEG_NOT_AVAILABLE' : 'MEDIA_PROCESSING_FAILED')); });
  child.on('close', (code) => { clearTimeout(timer); if (timedOut) reject(new Error('MEDIA_PROCESSING_TIMEOUT')); else if (code !== 0) reject(Object.assign(new Error('MEDIA_PROCESSING_FAILED'), { diagnostics: stderr.slice(-2000) })); else resolve({ stdout, stderr }); });
});

export class FfmpegMediaProcessor implements MediaProcessor {
  public async probe(inputPath: string): Promise<MediaProbeResult> {
    const { stdout } = await run(process.env.FFPROBE_PATH?.trim() || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration,format_name,size', '-show_entries', 'stream=codec_type,width,height', '-of', 'json', inputPath]);
    try {
      const value = JSON.parse(stdout) as { format?: { duration?: string; format_name?: string; size?: string }; streams?: Array<{ codec_type?: string; width?: number; height?: number }> };
      const duration = Number(value.format?.duration); const fileSize = Number(value.format?.size); const video = value.streams?.find((item) => item.codec_type === 'video');
      if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(fileSize) || fileSize <= 0) throw new Error();
      return { duration, format: value.format?.format_name ?? '', fileSize, hasVideo: Boolean(video), hasAudio: Boolean(value.streams?.some((item) => item.codec_type === 'audio')), width: video?.width, height: video?.height };
    } catch { throw new Error('MEDIA_PROCESSING_INVALID_OUTPUT'); }
  }

  public async composeNarration(input: ComposeNarrationInput): Promise<MediaProcessingResult> {
    const source = await this.probe(input.sourceVideoPath); const narration = await this.probe(input.narrationAudioPath);
    if (!source.hasVideo || !narration.hasAudio) throw new Error('MEDIA_PROCESSING_INVALID_OUTPUT');
    await run(process.env.FFMPEG_PATH?.trim() || 'ffmpeg', ['-y', '-i', input.sourceVideoPath, '-i', input.narrationAudioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-af', 'apad', '-t', String(source.duration), '-movflags', '+faststart', input.outputPath]);
    const output = await this.probe(input.outputPath); const disk = await stat(input.outputPath);
    if (!output.hasVideo || !output.hasAudio || disk.size <= 0) throw new Error('MEDIA_PROCESSING_INVALID_OUTPUT');
    return { ...output, fileSize: disk.size, mimeType: 'video/mp4' };
  }
}
