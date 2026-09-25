import type { LanguageCode } from '../projects/types';
import { mockTranscriptLines } from '../transcript/mockTranscriptData';

// Fixed development samples, not a translation engine. Exact S7 Vietnamese samples
// have reviewed English equivalents; edited/unknown source text gets a labelled sample.
const vietnameseToEnglish = [
  'Hello everyone.',
  'Today we are exploring the land of An Giang.',
  'The wide fields welcome the early morning sunlight.',
  'Along the river, life unfolds peacefully.',
  'Every stop has a story of its own.',
  'The system will help turn speech in the video into text.',
  'You can review and edit each segment along the timeline.',
  'The content will then be ready for translation.',
  'A suitable voice will bring the story closer to the audience.',
  'Thank you for following this journey.',
] as const;

const samplePrefix: Record<LanguageCode, string> = {
  vi: 'Bản dịch mẫu cho đoạn',
  en: 'Sample translation for segment',
  ja: 'サンプル翻訳：セグメント',
  ko: '샘플 번역: 구간',
};

export function getMockTranslatedText(source: LanguageCode, target: LanguageCode, text: string, sequence: number): string {
  const index = mockTranscriptLines[source].findIndex((line) => line.trim() === text.trim());
  if (index < 0) return samplePrefix[target] + ' ' + sequence + '.';
  if (source === 'vi' && target === 'en') return vietnameseToEnglish[index];
  return mockTranscriptLines[target][index] ?? samplePrefix[target] + ' ' + sequence + '.';
}
