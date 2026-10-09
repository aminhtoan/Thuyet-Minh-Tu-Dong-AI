import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Language } from '../models/Language.js';
import { Voice } from '../models/Voice.js';

const openAiVoices = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar']);

export const seedVoiceCatalog = async () => {
  const provider = process.env.TTS_PROVIDER?.trim().toLowerCase();
  const providerVoiceId = process.env.TTS_DEFAULT_VOICE?.trim().toLowerCase();
  if (provider !== 'openai' || !providerVoiceId || !openAiVoices.has(providerVoiceId)) throw new Error('TTS_PROVIDER/TTS_DEFAULT_VOICE chưa phải cấu hình OpenAI voice được hỗ trợ.');
  const existing = await Voice.countDocuments({ provider });
  if (existing > 0) return { status: 'exists' as const, created: 0 };
  const languages = await Language.find({ isActive: true });
  if (!languages.length) throw new Error('Không có Language active để seed voice catalog.');
  const result = await Voice.insertMany(languages.map((language) => ({ languageId: language._id, provider, providerVoiceId, name: providerVoiceId[0]?.toUpperCase() + providerVoiceId.slice(1), gender: 'NEUTRAL', description: `OpenAI ${providerVoiceId}`, isActive: true })));
  return { status: 'created' as const, created: result.length };
};

if (process.argv[1]?.endsWith('seed-voice-catalog.ts') || process.argv[1]?.endsWith('seed-voice-catalog.js')) {
  connectDatabase(env.mongoUri).then(async () => { const result = await seedVoiceCatalog(); console.log(`Voice catalog: ${result.status}; created=${result.created}`); }).catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Không thể seed voice catalog.'); process.exitCode = 1; }).finally(disconnectDatabase);
}
