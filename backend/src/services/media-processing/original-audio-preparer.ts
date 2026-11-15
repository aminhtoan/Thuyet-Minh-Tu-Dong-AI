import { realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, sep } from 'node:path';
import { uploadRoot } from '../../utils/file.js';
import { resolveMediaExecutable } from '../../utils/media-executable.js';
import type { OriginalAudioPreparer } from '../original-audio-artifact.js';
import { FfmpegMediaProcessor, runMediaCommand } from './ffmpeg-media-processor.js';
import { MediaProcessingError } from './processing-diagnostics.js';

export class FfmpegOriginalAudioPreparer implements OriginalAudioPreparer {
  constructor(private readonly command: typeof runMediaCommand = runMediaCommand,
    private readonly resolveExecutable = resolveMediaExecutable) {}
  async prepare(sourcePath: string, destinationPath: string, signal?: AbortSignal): Promise<{ duration: number; mimeType: 'audio/mpeg' }> {
    const fail = (code: string): never => { throw new MediaProcessingError({ stage: 'VALIDATE_OUTPUT', code, durationMs: 0 }); };
    if (signal?.aborted) fail('MEDIA_PROCESSING_CANCELLED');
    const root = await realpath(uploadRoot);
    const source = await realpath(sourcePath);
    const parent = await realpath(dirname(destinationPath));
    const inside = (path: string) => { const rel = relative(root, path); return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); };
    const artifactRoot = `${root}${sep}published-original${sep}`;
    if (!inside(source) || !inside(parent) || !`${parent}${sep}`.startsWith(artifactRoot)
      || !/^[a-f0-9-]+\.partial\.mp3$/i.test(destinationPath.split(/[\\/]/).at(-1) ?? '') || source === destinationPath) fail('ORIGINAL_AUDIO_INVALID_PATH');
    const ffmpeg = await this.resolveExecutable('ffmpeg', process.env.FFMPEG_PATH?.trim());
    const ffprobe = await this.resolveExecutable('ffprobe', process.env.FFPROBE_PATH?.trim());
    const processor = new FfmpegMediaProcessor((binary, args, stage) => this.command(stage.startsWith('PROBE') ? ffprobe : binary, args, stage, signal));
    const input = await processor.probe(source, 'PROBE_SOURCE');
    if (!input.hasAudio) fail('ORIGINAL_AUDIO_NO_AUDIO_TRACK');
    if (!input.format.split(',').some(format => ['mov', 'mp4', 'matroska', 'webm', 'mp3', 'wav', 'ogg', 'flac', 'aac'].includes(format))) fail('ORIGINAL_AUDIO_UNSUPPORTED_CONTAINER');
    await this.command(ffmpeg, ['-nostdin', '-n', '-i', source, '-map', '0:a:0', '-vn', '-sn', '-dn', '-map_metadata', '-1',
      '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-f', 'mp3', destinationPath], 'RENDER', signal);
    if (signal?.aborted) fail('MEDIA_PROCESSING_CANCELLED');
    const output = await processor.probe(destinationPath, 'PROBE_OUTPUT');
    // Allow MP3 encoder padding and small timestamp/container rounding, never trim to fit.
    const tolerance = Math.max(0.25, input.duration * 0.01);
    if (!output.hasAudio || output.hasVideo || output.audioCodec !== 'mp3' || !output.format.split(',').includes('mp3')
      || Math.abs(output.duration - input.duration) > tolerance || (await stat(destinationPath)).size <= 0) fail('ORIGINAL_AUDIO_INVALID_OUTPUT');
    return { duration: output.duration, mimeType: 'audio/mpeg' };
  }
}
