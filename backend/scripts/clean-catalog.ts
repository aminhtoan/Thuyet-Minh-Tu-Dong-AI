import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { Language } from '../src/models/Language.js';
import { Voice } from '../src/models/Voice.js';

async function main() {
  await connectDatabase(env.mongoUri);

  console.log('Connecting to database...');

  const standardLanguages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  ];

  // 1. Delete all non-standard languages
  const standardCodes = new Set(standardLanguages.map(l => l.code));
  await Language.deleteMany({ code: { $nin: Array.from(standardCodes) } });

  // 2. Wipe ALL old voices completely
  await Voice.deleteMany({});
  console.log('Cleared all old voices.');

  // 3. For each standard language, ensure exactly 1 language record and 1 voice record
  for (const std of standardLanguages) {
    let lang = await Language.findOne({ code: std.code });
    if (!lang) {
      lang = await Language.create({
        code: std.code,
        name: std.name,
        nativeName: std.nativeName,
        isActive: true,
      });
    } else {
      lang.name = std.name;
      lang.nativeName = std.nativeName;
      lang.isActive = true;
      await lang.save();
    }

    // Exactly 1 voice per language
    await Voice.create({
      languageId: lang._id,
      provider: 'gemini',
      providerVoiceId: 'kore',
      name: `Gemini Voice (${std.name})`,
      gender: 'FEMALE',
      description: `Giọng đọc Gemini AI chuẩn cho ${std.name}`,
      isActive: true,
    });
    console.log(`Configured 1 voice for ${std.code} (${std.name})`);
  }

  const finalLangs = await Language.find({ isActive: true }).sort({ code: 1 });
  console.log('Final Active Languages count:', finalLangs.length);
  for (const l of finalLangs) {
    console.log(` - [${l.code}] ${l.name} (${l.nativeName})`);
  }

  const finalVoices = await Voice.find({ isActive: true });
  console.log('Final Active Voices count:', finalVoices.length);
  for (const v of finalVoices) {
    console.log(` - Voice: ${v.name} | Provider: ${v.provider}`);
  }

  await disconnectDatabase();
}

main().catch(err => {
  console.error('Error running clean-catalog:', err);
  process.exit(1);
});
