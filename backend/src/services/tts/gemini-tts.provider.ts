import { spawn } from 'node:child_process';
import { createTrackedResource } from '../../maintenance/runtime.js';
import { GoogleGenAI } from '@google/genai';
import type { TtsProvider, TtsProviderInput, TtsProviderResult } from './tts-provider.interface.js';
import { resolveMediaExecutable } from '../../utils/media-executable.js';

export const GEMINI_TTS_MODEL = 'gemini-3.8-flash-tts';

const GEMINI_VOICE_MAP: Record<string, string> = {
  kore: 'Kore',
  aoede: 'Aoede',
  leda: 'Leda',
  puck: 'Puck',
  fenrir: 'Fenrir',
  orus: 'Orus',
  zephyr: 'Zephyr',
  charon: 'Charon',
  coral: 'Kore',
  alloy: 'Aoede',
  nova: 'Leda',
  echo: 'Fenrir',
  onyx: 'Orus',
  fable: 'Puck',
};

export class GeminiTtsProvider implements TtsProvider {
  constructor(
    private readonly createClient = (apiKey: string) => new GoogleGenAI({ apiKey }),
    private readonly convert = wavToMp3,
  ) {}
  public async synthesize(input: TtsProviderInput): Promise<TtsProviderResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error('TTS_NOT_CONFIGURED');
    if (input.text.length > 4096) throw new Error('TTS_TEXT_TOO_LARGE');

    const voiceName = GEMINI_VOICE_MAP[input.voice.toLowerCase()] || input.voice || 'Kore';
    const client = this.createClient(apiKey);

    let interaction;
    try {
      interaction = await client.interactions.create({
        model: GEMINI_TTS_MODEL,
        input: [{
          type: 'user_input',
          content: [{
            type: 'text',
            text: input.text,
          }],
        }],
        response_format: { type: 'audio' },
        generation_config: {
          speech_config: [{ voice: voiceName }],
        },
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      if (timedOut) throw new Error('TTS_TIMEOUT');
      console.error('Gemini TTS provider error:', error);
      const err = new Error('TTS_PROVIDER_ERROR');
      if (error instanceof Error) err.message = `${err.message}: ${error.message}`;
      throw err;
    }

    if (!interaction.output_audio?.data) {
      throw new Error('TTS_INVALID_RESPONSE');
    }

    const wavBuffer = Buffer.from(interaction.output_audio.data, 'base64');
    if (!wavBuffer.length) throw new Error('TTS_INVALID_RESPONSE');

    let mp3Buffer: Buffer;
    try { mp3Buffer = await this.convert(wavBuffer); }
    catch { throw new Error('TTS_AUDIO_CONVERSION_FAILED'); }
    if (!mp3Buffer.length) throw new Error('TTS_AUDIO_CONVERSION_FAILED');

    return {
      audio: new Uint8Array(mp3Buffer),
      format: 'mp3',
      mimeType: 'audio/mpeg',
      provider: 'gemini',
      model: GEMINI_TTS_MODEL,
    };
  }
}

export async function wavToMp3(wavBuffer: Buffer): Promise<Buffer> {
    const ffmpegPath = await resolveMediaExecutable('ffmpeg', process.env.FFMPEG_PATH);
    return new Promise<Buffer>((resolve, reject) => {
      const ffmpeg = createTrackedResource(()=>spawn(ffmpegPath, [
        '-y', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1',
      ], { windowsHide: true, shell: false }));
      const timer = setTimeout(() => { ffmpeg.kill('SIGKILL'); reject(new Error('TTS_AUDIO_CONVERSION_FAILED')); }, 120_000);
      const chunks: Buffer[] = [];
      ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.stderr.resume();
      ffmpeg.stdin.on('error', () => { clearTimeout(timer); ffmpeg.kill('SIGKILL'); reject(new Error('TTS_AUDIO_CONVERSION_FAILED')); });
      ffmpeg.on('error', () => { clearTimeout(timer); reject(new Error('TTS_AUDIO_CONVERSION_FAILED')); });
      ffmpeg.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(Buffer.concat(chunks));
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
      ffmpeg.stdin.write(wavBuffer);
      ffmpeg.stdin.end();
    });
}
