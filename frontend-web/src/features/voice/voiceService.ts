import type { LanguageCode } from '../projects/types';
import { api } from '../../lib/api';
import type { RequestOptions, Voice } from './types';

type Catalog = { languages: Array<{ id: string; code: string; name: string; nativeName: string }>; voices: Array<{ id: string; language: { code: string } | null; name: string; gender: string; description: string; previewUrl: string | null }> };
const mapGender = (value: string): Voice['gender'] => value.toUpperCase() === 'FEMALE' ? 'Female' : value.toUpperCase() === 'MALE' ? 'Male' : 'Neutral';
const mapVoice = (voice: Catalog['voices'][number]): Voice => ({ id: voice.id, name: voice.name, languageCode: voice.language?.code ?? '', gender: mapGender(voice.gender), description: voice.description, previewUrl: voice.previewUrl ?? undefined, isActive: true });
export const voiceService = {
  async getVoices(languageCode: LanguageCode, options: RequestOptions = {}): Promise<Voice[]> {
    const response = await api<Catalog>(`/voices?language=${encodeURIComponent(languageCode)}`, { signal: options.signal }); return response.voices.map(mapVoice);
  },
  async getLanguages(options: RequestOptions = {}) { const response = await api<Catalog>('/voices', { signal: options.signal }); return response.languages; },
  async getVoice(id: string, options: RequestOptions = {}): Promise<Voice | null> {
    const response = await api<Catalog>('/voices', { signal: options.signal }); const voice = response.voices.find((candidate) => candidate.id === id); return voice ? mapVoice(voice) : null;
  },
  async previewVoice(id: string, options: RequestOptions = {}): Promise<void> {
    const voice = await this.getVoice(id, options); if (!voice) throw new Error('Giọng đọc không khả dụng.');
    throw new Error(voice.previewUrl ? 'Preview URL không được phát tự động vì chưa xác định cơ chế xác thực.' : 'Giọng đọc này không có bản nghe thử.');
  },
};
