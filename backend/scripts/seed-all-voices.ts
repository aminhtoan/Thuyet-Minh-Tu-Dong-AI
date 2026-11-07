import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { Language } from '../src/models/Language.js';
import { Voice } from '../src/models/Voice.js';

const ALL_LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt', nativeName: 'Tiếng Việt' },
  { code: 'en', name: 'Tiếng Anh', nativeName: 'English' },
  { code: 'ja', name: 'Tiếng Nhật', nativeName: '日本語' },
  { code: 'ko', name: 'Tiếng Hàn', nativeName: '한국어' },
  { code: 'zh', name: 'Tiếng Trung (giản thể)', nativeName: '中文（简体）' },
  { code: 'fr', name: 'Tiếng Pháp', nativeName: 'Français' },
  { code: 'de', name: 'Tiếng Đức', nativeName: 'Deutsch' },
  { code: 'es', name: 'Tiếng Tây Ban Nha', nativeName: 'Español' },
  { code: 'it', name: 'Tiếng Ý', nativeName: 'Italiano' },
  { code: 'pt', name: 'Tiếng Bồ Đào Nha', nativeName: 'Português' },
  { code: 'ru', name: 'Tiếng Nga', nativeName: 'Русский' },
  { code: 'nl', name: 'Tiếng Hà Lan', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Tiếng Ba Lan', nativeName: 'Polski' },
  { code: 'th', name: 'Tiếng Thái', nativeName: 'ไทย' },
  { code: 'id', name: 'Tiếng Indonesia', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Tiếng Mã Lai', nativeName: 'Bahasa Melayu' },
  { code: 'hi', name: 'Tiếng Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Tiếng Ả Rập', nativeName: 'العربية' },
  { code: 'tr', name: 'Tiếng Thổ Nhĩ Kỳ', nativeName: 'Türkçe' },
];

async function main() {
  await connectDatabase(env.mongoUri);
  console.log('Connected to database. Seeding voices for all 19 languages...');

  let createdCount = 0;
  let updatedCount = 0;

  for (const std of ALL_LANGUAGES) {
    let lang = await Language.findOne({ code: std.code });
    if (!lang) {
      lang = await Language.create({
        code: std.code,
        name: std.name,
        nativeName: std.nativeName,
        isActive: true,
      });
      console.log(`Created language: ${std.code}`);
    } else if (!lang.isActive) {
      lang.isActive = true;
      await lang.save();
    }

    // 1. Female voice (Kore)
    const femaleExists = await Voice.findOne({
      languageId: lang._id,
      provider: 'gemini',
      providerVoiceId: 'kore',
    });
    if (!femaleExists) {
      await Voice.create({
        languageId: lang._id,
        provider: 'gemini',
        providerVoiceId: 'kore',
        name: `Gemini Voice (${std.name}) (Nữ)`,
        gender: 'FEMALE',
        description: `Giọng đọc nữ Gemini AI chuẩn cho ${std.name}`,
        isActive: true,
      });
      createdCount++;
      console.log(`+ Added female voice for ${std.code} (${std.name})`);
    } else {
      updatedCount++;
    }

    // 2. Male voice (Fenrir)
    const maleExists = await Voice.findOne({
      languageId: lang._id,
      provider: 'gemini',
      providerVoiceId: 'fenrir',
    });
    if (!maleExists) {
      await Voice.create({
        languageId: lang._id,
        provider: 'gemini',
        providerVoiceId: 'fenrir',
        name: `Gemini Fenrir (${std.name}) (Nam)`,
        gender: 'MALE',
        description: `Giọng đọc nam Gemini AI cho ${std.name}`,
        isActive: true,
      });
      createdCount++;
      console.log(`+ Added male voice for ${std.code} (${std.name})`);
    } else {
      updatedCount++;
    }
  }

  // Soft-delete/deactivate test fixture languages and voices so they don't pollute queries
  await Language.updateMany(
    {
      $or: [
        { code: /^xx-/i },
        { code: /^[a-z]{2}-[a-f0-9]{6,8}$/i },
        { name: /^s2[0-9]\s/i },
        { name: /^test\s/i },
      ],
    },
    { $set: { isActive: false } }
  );

  await Voice.updateMany(
    {
      $or: [
        { name: /^s2[0-9]\s/i },
        { name: /^test\s/i },
      ],
    },
    { $set: { isActive: false } }
  );

  console.log(`Done! Created: ${createdCount} voices, Existing: ${updatedCount} voices.`);

  const activeVoices = await Voice.find({ isActive: true, provider: 'gemini' });
  console.log(`Total active Gemini voices in database: ${activeVoices.length}`);

  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Error seeding voices:', err);
  process.exit(1);
});

