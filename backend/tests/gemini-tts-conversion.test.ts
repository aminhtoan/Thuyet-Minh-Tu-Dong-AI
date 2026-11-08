import test from 'node:test';
import assert from 'node:assert/strict';
import type { GoogleGenAI } from '@google/genai';
import { GeminiTtsProvider, GEMINI_TTS_MODEL } from '../src/services/tts/gemini-tts.provider.js';

test('mock Gemini TTS preserves model/voice and fails closed instead of returning WAV as MP3', async t => {
  const old = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'synthetic-only';
  t.after(() => { if (old === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = old; });
  t.mock.method(globalThis, 'fetch', async () => { throw Error('REAL_PROVIDER_FORBIDDEN'); });
  const wav = Buffer.from('RIFF-synthetic-wave');
  const mp3 = Buffer.from('ID3-synthetic-mp3');
  const client = () => ({ interactions: { async create(input: { model: string; generation_config: { speech_config: { voice: string }[] } }) {
    assert.equal(input.model, GEMINI_TTS_MODEL);
    assert.equal(input.generation_config.speech_config[0]?.voice, 'Kore');
    return { output_audio: { data: wav.toString('base64') } };
  } } }) as unknown as GoogleGenAI;
  const input = { text: 'Synthetic', language: 'en', voice: 'kore', format: 'mp3' as const };
  const result = await new GeminiTtsProvider(client, async bytes => { assert.deepEqual(bytes, wav); return mp3; }).synthesize(input);
  assert.deepEqual(Buffer.from(result.audio), mp3);
  assert.equal(result.mimeType, 'audio/mpeg');
  for (const convert of [async () => { throw Error('synthetic-conversion-failure'); }, async () => Buffer.alloc(0)]) {
    await assert.rejects(new GeminiTtsProvider(client, convert).synthesize(input), { message: 'TTS_AUDIO_CONVERSION_FAILED' });
  }
});
