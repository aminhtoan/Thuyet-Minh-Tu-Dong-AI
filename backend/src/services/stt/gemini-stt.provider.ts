import { GoogleGenAI } from '@google/genai';
import { access, constants, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { FfmpegMediaProcessor } from '../media-processing/ffmpeg-media-processor.js';
import type { SttInput, SttProvider, SttResult } from './stt-provider.interface.js';

export const GEMINI_STT_MODEL = 'gemini-3.5-transcribe';
export const GEMINI_STT_ERRORS = ['STT_NOT_CONFIGURED', 'STT_INVALID_KEY', 'STT_MODEL_UNAVAILABLE', 'STT_QUOTA_EXCEEDED', 'STT_INVALID_FILE', 'STT_FILE_TOO_LARGE', 'STT_TIMEOUT', 'STT_INVALID_RESPONSE', 'STT_NO_SPEECH', 'STT_PROVIDER_ERROR'] as const;
export class GeminiSttError extends Error {
  constructor(public readonly code: typeof GEMINI_STT_ERRORS[number], public readonly httpStatus?: number) { super(code); }
}
export interface GeminiTransport {
  checkModel(model: string, signal: AbortSignal): Promise<void>;
  upload(file: string, mime: string, signal: AbortSignal): Promise<{ name?: string; uri?: string; state?: string }>;
  getFile(name: string, signal: AbortSignal): Promise<{ name?: string; uri?: string; state?: string }>;
  deleteFile(name: string): Promise<void>;
  transcribe(model: string, uri: string, mime: string, language: string, signal: AbortSignal): Promise<unknown>;
}
const sdkTransport = (key: string): GeminiTransport => {
  const ai = new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 120_000, retryOptions: { attempts: 1 } } });
  return {
    async checkModel(model, signal) { await ai.models.get({ model, config: { abortSignal: signal } }); },
    upload: (file, mime, signal) => ai.files.upload({ file, config: { mimeType: mime, abortSignal: signal } }),
    getFile: (name, signal) => ai.files.get({ name, config: { abortSignal: signal } }),
    async deleteFile(name) { await ai.files.delete({ name, config: { httpOptions: { timeout: 10_000 } } }); },
    transcribe: (model, uri, mime, language, signal) => ai.interactions.create({
      model, store: false,
      input: [{ type: 'audio', uri, mime_type: mime }],
      generation_config: { transcription_config: { language_codes: [language], mode: { type: 'verbatim', timestamp_granularities: ['word'] } } },
    }, { signal, timeout: 120_000, maxRetries: 0 }),
  };
};
const wordSchema = z.object({ type: z.literal('word_info'), text: z.string().trim().min(1), start_offset: z.string(), end_offset: z.string() });
const outputSchema = z.object({ status: z.literal('completed'), output_text: z.string().optional(), steps: z.array(z.object({ type: z.string(), content: z.array(z.object({ type: z.string(), text: z.string().optional(), annotations: z.array(z.unknown()).optional() })).optional() })) });
const offset = (value: string): number => {
  if (!/^\d+(?:\.\d+)?s$/.test(value)) throw new GeminiSttError('STT_INVALID_RESPONSE');
  const result = Number(value.slice(0, -1));
  if (!Number.isFinite(result)) throw new GeminiSttError('STT_INVALID_RESPONSE');
  return result;
};
export const mapGeminiTranscript = (value: unknown, duration: number, language: string): SttResult => {
  const output = outputSchema.safeParse(value);
  if (!output.success || !Number.isFinite(duration) || duration <= 0) throw new GeminiSttError('STT_INVALID_RESPONSE');
  const contents = output.data.steps.filter((s) => s.type === 'model_output').flatMap((s) => s.content ?? []);
  const text = (output.data.output_text ?? contents.filter((c) => c.type === 'text').map((c) => c.text ?? '').join(' ')).trim();
  if (!text) throw new GeminiSttError('STT_NO_SPEECH');
  const words = contents.flatMap((c) => c.annotations ?? []).filter((a) => typeof a === 'object' && a !== null && 'type' in a && a.type === 'word_info');
  if (!words.length) throw new GeminiSttError('STT_INVALID_RESPONSE');
  let previousEnd = 0;
  const segments = words.map((word) => {
    const parsed = wordSchema.safeParse(word);
    if (!parsed.success) throw new GeminiSttError('STT_INVALID_RESPONSE');
    const start = offset(parsed.data.start_offset); const end = offset(parsed.data.end_offset);
    if (start < previousEnd || end <= start || end > duration) throw new GeminiSttError('STT_INVALID_RESPONSE');
    previousEnd = end;
    return { start, end, text: parsed.data.text };
  });
  return { text, duration, language, segments };
};
const mapError = (error: unknown): GeminiSttError => {
  if (error instanceof GeminiSttError) return error;
  const e = error as { status?: number; code?: number; name?: string; message?: string } | null;
  const status = typeof e?.status === 'number' ? e.status : typeof e?.code === 'number' ? e.code : undefined;
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return new GeminiSttError('STT_TIMEOUT');
  if (status === 401 || (status === 400 && e?.message?.includes('API_KEY_INVALID'))) return new GeminiSttError('STT_INVALID_KEY', status);
  if (status === 400) return new GeminiSttError('STT_PROVIDER_ERROR', status);
  if (status === 403 || status === 404) return new GeminiSttError('STT_MODEL_UNAVAILABLE', status);
  if (status === 429) return new GeminiSttError('STT_QUOTA_EXCEEDED', status);
  return new GeminiSttError('STT_PROVIDER_ERROR', status);
};
export class GeminiSttProvider implements SttProvider {
  constructor(private readonly transport?: GeminiTransport, private readonly probe = (file: string) => new FfmpegMediaProcessor().probe(file), private readonly extract = async (source: string, destination: string) => {
    await promisify(execFile)(process.env.FFMPEG_PATH || 'ffmpeg', ['-nostdin', '-y', '-i', source, '-map', '0:a:0', '-vn', '-c:a', 'pcm_s16le', destination], { timeout: 120_000, windowsHide: true });
  }) {}
  async transcribe(input: SttInput): Promise<SttResult> {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new GeminiSttError('STT_NOT_CONFIGURED');
    const model = process.env.GEMINI_STT_MODEL?.trim() || GEMINI_STT_MODEL;
    if (model !== GEMINI_STT_MODEL) throw new GeminiSttError('STT_MODEL_UNAVAILABLE');
    const client = this.transport ?? sdkTransport(key);
    const signal = AbortSignal.timeout(120_000);
    let temporary: string | undefined; let uploadedName: string | undefined;
    try {
      if (!['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime'].includes(input.mimeType)) throw new GeminiSttError('STT_INVALID_FILE');
      let disk;
      try { await access(input.filePath, constants.R_OK); disk = await stat(input.filePath); } catch { throw new GeminiSttError('STT_INVALID_FILE'); }
      if (!disk.isFile() || disk.size <= 0) throw new GeminiSttError('STT_INVALID_FILE');
      if (disk.size > 500 * 1024 * 1024) throw new GeminiSttError('STT_FILE_TOO_LARGE');
      let source;
      try { source = await this.probe(input.filePath); } catch { throw new GeminiSttError('STT_INVALID_FILE'); }
      if (!source.hasAudio || !Number.isFinite(source.duration) || source.duration <= 0 || source.duration > 3600) throw new GeminiSttError('STT_INVALID_FILE');
      // Verify access to the configured model BEFORE uploading private media.
      await client.checkModel(model, signal);
      let file = input.filePath; let mime = input.mimeType === 'audio/x-wav' ? 'audio/wav' : input.mimeType;
      if (mime.startsWith('video/') || mime === 'audio/mp4') {
        temporary = await mkdtemp(join(tmpdir(), 'gemini-stt-')); file = join(temporary, 'audio.wav'); mime = 'audio/wav';
        try { await this.extract(input.filePath, file); } catch { throw new GeminiSttError('STT_INVALID_FILE'); }
        const extracted = await stat(file);
        if (!extracted.size || extracted.size > 500 * 1024 * 1024) throw new GeminiSttError('STT_FILE_TOO_LARGE');
        const audio = await this.probe(file);
        if (!audio.hasAudio || !Number.isFinite(audio.duration) || audio.duration <= 0) throw new GeminiSttError('STT_INVALID_FILE');
      }
      let remote = await client.upload(file, mime, signal); uploadedName = remote.name;
      while (remote.state === 'PROCESSING') {
        if (!uploadedName || signal.aborted) throw new GeminiSttError('STT_TIMEOUT');
        await new Promise<void>((resolve, reject) => { const abort = () => { clearTimeout(timer); reject(new GeminiSttError('STT_TIMEOUT')); }; const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 1000); signal.addEventListener('abort', abort, { once: true }); });
        remote = await client.getFile(uploadedName, signal);
      }
      if (!remote.uri || !uploadedName || remote.state !== 'ACTIVE') throw new GeminiSttError('STT_INVALID_FILE');
      const language = ({ vi: 'vi-VN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' } as Record<string, string>)[input.language] ?? input.language;
      return mapGeminiTranscript(await client.transcribe(model, remote.uri, mime, language, signal), source.duration, input.language);
    } catch (error) { throw mapError(error); }
    finally {
      if (uploadedName) { try { await client.deleteFile(uploadedName); } catch { /* Remote Files expire; do not log URLs, headers or provider payload. */ } }
      if (temporary) { try { await rm(temporary, { recursive: true, force: true }); } catch { if (process.env.NODE_ENV === 'development') console.error('STT temporary cleanup failed (path suppressed).'); } }
    }
  }
}
