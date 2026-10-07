import type { Voice } from './types';

// Development-only identities, not a provider voice catalog.
export const mockVoices: readonly Voice[] = [
  { id: 'voice-en-aria', name: 'Aria', languageCode: 'en', gender: 'Female', description: 'Giọng đọc tự nhiên và rõ ràng.', isActive: true },
  { id: 'voice-en-guy', name: 'Guy', languageCode: 'en', gender: 'Male', description: 'Cách đọc ấm áp và chuyên nghiệp.', isActive: true },
  { id: 'voice-en-jenny', name: 'Jenny', languageCode: 'en', gender: 'Female', description: 'Giọng thân thiện và gần gũi.', isActive: true },
  { id: 'voice-ja-nanami', name: 'Nanami', languageCode: 'ja', gender: 'Female', description: 'Giọng đọc tiếng Nhật rõ ràng.', isActive: true },
  { id: 'voice-ja-keita', name: 'Keita', languageCode: 'ja', gender: 'Male', description: 'Cách đọc tiếng Nhật chuyên nghiệp.', isActive: true },
  { id: 'voice-ko-sunhi', name: 'SunHi', languageCode: 'ko', gender: 'Female', description: 'Giọng đọc tiếng Hàn tự nhiên.', isActive: true },
  { id: 'voice-ko-injoon', name: 'InJoon', languageCode: 'ko', gender: 'Male', description: 'Cách đọc tiếng Hàn chuyên nghiệp.', isActive: true },
  { id: 'voice-vi-linh', name: 'Linh', languageCode: 'vi', gender: 'Female', description: 'Giọng tiếng Việt rõ ràng và thân thiện.', isActive: true },
  { id: 'voice-vi-minh', name: 'Minh', languageCode: 'vi', gender: 'Male', description: 'Giọng tiếng Việt ấm áp.', isActive: true },
  { id: 'voice-en-inactive', name: 'Mẫu lưu trữ', languageCode: 'en', gender: 'Male', description: 'Mẫu phát triển không khả dụng.', isActive: false },
];
