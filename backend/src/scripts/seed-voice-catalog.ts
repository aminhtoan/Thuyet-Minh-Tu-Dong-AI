import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Language } from '../models/Language.js';
import { Voice } from '../models/Voice.js';

const openAiVoices = [
  { providerVoiceId: 'coral', name: 'Coral', gender: 'FEMALE', description: 'OpenAI Coral (Nữ nhẹ nhàng)' },
  { providerVoiceId: 'alloy', name: 'Alloy', gender: 'FEMALE', description: 'OpenAI Alloy (Nữ truyền cảm)' },
  { providerVoiceId: 'nova', name: 'Nova', gender: 'FEMALE', description: 'OpenAI Nova (Nữ ấm áp)' },
  { providerVoiceId: 'echo', name: 'Echo', gender: 'MALE', description: 'OpenAI Echo (Nam trầm ấm)' },
  { providerVoiceId: 'onyx', name: 'Onyx', gender: 'MALE', description: 'OpenAI Onyx (Nam đĩnh đạc)' },
  { providerVoiceId: 'fable', name: 'Fable', gender: 'MALE', description: 'OpenAI Fable (Nam trẻ trung)' },
];

export const seedVoiceCatalog = async () => {
  const provider = process.env.TTS_PROVIDER?.trim().toLowerCase() || 'openai';
  if (provider !== 'openai') throw new Error('TTS_PROVIDER chưa phải cấu hình OpenAI.');
  const languages = await Language.find({ isActive: true });
  if (!languages.length) throw new Error('Không có Language active để seed voice catalog.');
  let created = 0;
  for (const language of languages) {
    for (const voice of openAiVoices) {
      const exists = await Voice.findOne({ provider, providerVoiceId: voice.providerVoiceId, languageId: language._id });
      if (!exists) {
        await Voice.create({
          languageId: language._id,
          provider,
          providerVoiceId: voice.providerVoiceId,
          name: voice.name,
          gender: voice.gender,
          description: voice.description,
          isActive: true,
        });
        created++;
      }
    }
  }
  return { status: created > 0 ? ('created' as const) : ('exists' as const), created };
};


if (process.argv[1]?.endsWith('seed-voice-catalog.ts') || process.argv[1]?.endsWith('seed-voice-catalog.js')) {
  connectDatabase(env.mongoUri).then(async () => { const result = await seedVoiceCatalog(); console.log(`Voice catalog: ${result.status}; created=${result.created}`); }).catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Không thể seed voice catalog.'); process.exitCode = 1; }).finally(disconnectDatabase);
}
