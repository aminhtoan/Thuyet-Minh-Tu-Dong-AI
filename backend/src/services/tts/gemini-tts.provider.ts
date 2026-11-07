import { spawn } from 'node:child_process';
import { GoogleGenAI } from '@google/genai';
import type { TtsProvider, TtsProviderInput, TtsProviderResult } from './tts-provider.interface.js';

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
  public async synthesize(input: TtsProviderInput): Promise<TtsProviderResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error('TTS_NOT_CONFIGURED');
    if (input.text.length > 4096) throw new Error('TTS_TEXT_TOO_LARGE');

    const voiceName = GEMINI_VOICE_MAP[input.voice.toLowerCase()] || input.voice || 'Kore';
    const client = new GoogleGenAI({ apiKey });

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

    const ffmpegPath = process.env.FFMPEG_PATH?.trim() || 'ffmpeg';
    const mp3Buffer = await new Promise<Buffer>((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-y', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1',
      ]);
      const chunks: Buffer[] = [];
      ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.on('error', (err) => reject(err));
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve(Buffer.concat(chunks));
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
      ffmpeg.stdin.write(wavBuffer);
      ffmpeg.stdin.end();
    }).catch(() => wavBuffer);

    return {
      audio: new Uint8Array(mp3Buffer),
      format: 'mp3',
      mimeType: 'audio/mpeg',
      provider: 'gemini',
      model: GEMINI_TTS_MODEL,
    };
  }
}
