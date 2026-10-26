import fs from 'node:fs';
import path from 'node:path';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Language } from '../models/Language.js';
import { Media } from '../models/Media.js';
import { Narration } from '../models/Narration.js';
import { Project } from '../models/Project.js';
import { Result } from '../models/Result.js';
import { Transcript } from '../models/Transcript.js';
import { TranscriptSegment } from '../models/TranscriptSegment.js';
import { Translation } from '../models/Translation.js';
import { TranslationSegment } from '../models/TranslationSegment.js';
import { User } from '../models/User.js';
import { Voice } from '../models/Voice.js';

export const seedMockPipelineData = async () => {
  console.log('--- BẮT ĐẦU SEED DỮ LIỆU PIPELINE CHO RESULTS VÀ TRANSLATIONSEGMENTS ---');

  // 1. Tìm hoặc tạo User
  let user = await User.findOne({ status: 'ACTIVE' });
  if (!user) {
    user = await User.create({
      fullName: 'Phạm Minh Toàn',
      email: 'minhtoan.demo@gmail.com',
      passwordHash: '$2b$10$wE99QjQ.3vU3lX8kK.fO0eL5O9qM.8WdYkE6uE7iJ.O1yF.8U9Z2C',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    console.log(`Đã tạo User mẫu: ${user.email}`);
  }

  // 2. Tìm hoặc tạo Language & Voice
  let langVi = await Language.findOne({ code: 'vi' });
  if (!langVi) {
    langVi = await Language.create({ code: 'vi', name: 'Tiếng Việt', nativeName: 'Tiếng Việt', isActive: true });
  }
  let langEn = await Language.findOne({ code: 'en' });
  if (!langEn) {
    langEn = await Language.create({ code: 'en', name: 'English', nativeName: 'English', isActive: true });
  }

  let voice = await Voice.findOne({ languageId: langEn._id });
  if (!voice) {
    voice = await Voice.create({
      languageId: langEn._id,
      provider: 'openai',
      providerVoiceId: 'nova',
      name: 'Nova',
      gender: 'FEMALE',
      description: 'OpenAI Nova (Giọng nữ truyền cảm)',
      isActive: true,
    });
  }

  // 3. Tìm hoặc tạo Project
  let project = await Project.findOne();
  if (!project) {
    project = await Project.create({
      userId: user._id,
      name: 'Thuyết minh Trống đồng Đông Sơn',
      description: 'Dự án mẫu thuyết minh bảo tàng tích hợp AI đa ngôn ngữ',
      sourceLanguage: 'vi',
      status: 'COMPLETED',
      progress: 100,
    });
    console.log(`Đã tạo Project mẫu: ${project.name}`);
  }

  // 4. Tạo Media nếu chưa có
  let media = await Media.findOne({ projectId: project._id });
  if (!media) {
    media = await Media.create({
      projectId: project._id,
      originalName: 'trong_dong_dong_son.mp4',
      fileName: 'media_sample_trong_dong.mp4',
      storagePath: 'source/media_sample_trong_dong.mp4',
      mimeType: 'video/mp4',
      duration: 65.5,
      fileSize: 25400000,
    });
  }

  // 5. Tạo Transcript & TranscriptSegment
  let transcript = await Transcript.findOne({ projectId: project._id });
  if (!transcript) {
    transcript = await Transcript.create({
      projectId: project._id,
      languageCode: 'vi',
      fullText: 'Chào mừng quý khách đến với Bảo tàng Lịch sử Quốc gia. Trước mắt quý khách là Trống đồng Đông Sơn, bảo vật quốc gia tiêu biểu cho nền văn minh Văn Lang - Âu Lạc. Các họa tiết chim hạc và thuyền rồng trên mặt trống khắc họa sinh động đời sống của cư dân Việt cổ.',
      status: 'READY',
      revision: 1,
    });
  }

  let segments = await TranscriptSegment.find({ transcriptId: transcript._id }).sort({ sequence: 1 });
  if (!segments.length) {
    segments = await TranscriptSegment.insertMany([
      {
        transcriptId: transcript._id,
        sequence: 1,
        startTime: 0.0,
        endTime: 8.5,
        text: 'Chào mừng quý khách đến với Bảo tàng Lịch sử Quốc gia.',
      },
      {
        transcriptId: transcript._id,
        sequence: 2,
        startTime: 8.8,
        endTime: 22.0,
        text: 'Trước mắt quý khách là Trống đồng Đông Sơn, bảo vật quốc gia tiêu biểu cho nền văn minh Văn Lang - Âu Lạc.',
      },
      {
        transcriptId: transcript._id,
        sequence: 3,
        startTime: 22.5,
        endTime: 38.0,
        text: 'Các họa tiết chim hạc và thuyền rồng trên mặt trống khắc họa sinh động đời sống của cư dân Việt cổ.',
      },
    ]);
    console.log(`Đã tạo ${segments.length} phân đoạn TranscriptSegment.`);
  }

  // 6. Tạo Translation (English)
  let translation = await Translation.findOne({ projectId: project._id, targetLanguage: 'en' });
  if (!translation) {
    translation = await Translation.create({
      projectId: project._id,
      transcriptId: transcript._id,
      sourceLanguage: 'vi',
      targetLanguage: 'en',
      fullText: 'Welcome to the National History Museum. Before you is the Dong Son Bronze Drum, a national treasure of the Van Lang - Au Lac civilization. The crane and dragon boat patterns on the drum surface vividly depict the daily life of ancient Vietnamese residents.',
      status: 'READY',
      revision: 1,
      sourceTranscriptRevision: 1,
      alignmentFormat: 'GROUPS_V1',
      sourceRevision: 'rev1-seed',
      groupingVersion: 'v1.0',
      groups: [
        {
          groupId: '1111111111111111111111111111111111111111111111111111111111111111',
          sequence: 1,
          sourceSegmentIds: [segments[0]._id],
          sourceText: segments[0].text,
          translatedText: 'Welcome to the National History Museum.',
          startTime: segments[0].startTime,
          endTime: segments[0].endTime,
        },
        {
          groupId: '2222222222222222222222222222222222222222222222222222222222222222',
          sequence: 2,
          sourceSegmentIds: [segments[1]._id],
          sourceText: segments[1].text,
          translatedText: 'Before you is the Dong Son Bronze Drum, a national treasure of the Van Lang - Au Lac civilization.',
          startTime: segments[1].startTime,
          endTime: segments[1].endTime,
        },
        {
          groupId: '3333333333333333333333333333333333333333333333333333333333333333',
          sequence: 3,
          sourceSegmentIds: [segments[2]._id],
          sourceText: segments[2].text,
          translatedText: 'The crane and dragon boat patterns on the drum surface vividly depict the daily life of ancient Vietnamese residents.',
          startTime: segments[2].startTime,
          endTime: segments[2].endTime,
        },
      ],
      review: {
        reviewedBy: user._id,
        reviewedAt: new Date(),
        sourceRevision: 'rev1-seed',
        outputDigest: '4444444444444444444444444444444444444444444444444444444444444444',
        method: 'MANUAL_V1',
      },
    });
    console.log(`Đã tạo Translation tiếng Anh (id: ${translation._id})`);
  }

  // 7. SEED CHO BẢNG translationsegments
  const existingTransSegs = await TranslationSegment.countDocuments({ translationId: translation._id });
  if (existingTransSegs === 0) {
    const englishTexts = [
      'Welcome to the National History Museum.',
      'Before you is the Dong Son Bronze Drum, a national treasure of the Van Lang - Au Lac civilization.',
      'The crane and dragon boat patterns on the drum surface vividly depict the daily life of ancient Vietnamese residents.',
    ];

    const toInsert = segments.map((seg, idx) => ({
      translationId: translation._id,
      transcriptSegmentId: seg._id,
      translatedText: englishTexts[idx] || seg.text,
    }));

    await TranslationSegment.insertMany(toInsert);
    console.log(`✅ [THÀNH CÔNG] Đã seed ${toInsert.length} bản ghi vào collection translationsegments!`);
  } else {
    console.log(`ℹ️ Collection translationsegments đã có ${existingTransSegs} bản ghi.`);
  }

  // 8. Tạo Narration nếu chưa có
  let narration = await Narration.findOne({ projectId: project._id });
  if (!narration) {
    narration = await Narration.create({
      projectId: project._id,
      translationId: translation._id,
      revision: 1,
      sourceTranslationRevision: 1,
      voiceId: voice._id,
      languageCode: 'en',
      speed: 1.0,
      audioPath: 'narrations/sample_narration_dong_son_en.mp3',
      mimeType: 'audio/mpeg',
      fileSize: 3250000,
      provider: 'openai',
      model: 'tts-1',
      duration: 38.0,
      status: 'READY',
    });
    console.log(`Đã tạo Narration mẫu: ${narration.audioPath}`);
  }

  // 9. SEED CHO BẢNG results
  const existingResults = await Result.countDocuments({ projectId: project._id });
  if (existingResults === 0) {
    const resultDoc = await Result.create({
      projectId: project._id,
      narrationId: narration._id,
      sourceNarrationRevision: narration.revision || 1,
      languageCode: 'en',
      videoPath: 'results/sample_result_dong_son_en.mp4',
      audioPath: narration.audioPath,
      mimeType: 'video/mp4',
      duration: narration.duration || 38.0,
      fileSize: 24800000, // ~24.8 MB
      width: 1920,
      height: 1080,
    });
    console.log(`✅ [THÀNH CÔNG] Đã seed 1 bản ghi vào collection results (id: ${resultDoc._id})!`);
  } else {
    console.log(`ℹ️ Collection results đã có ${existingResults} bản ghi.`);
  }

  // Đảm bảo tệp mẫu tồn tại trong uploads/
  const uploadsDir = path.resolve('uploads');
  const resultsDir = path.join(uploadsDir, 'results');
  const narrationsDir = path.join(uploadsDir, 'narrations');
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.mkdirSync(narrationsDir, { recursive: true });

  const dummyResultFile = path.join(resultsDir, 'sample_result_dong_son_en.mp4');
  if (!fs.existsSync(dummyResultFile)) {
    fs.writeFileSync(dummyResultFile, Buffer.alloc(1024, 0));
  }
  const dummyNarrationFile = path.join(narrationsDir, 'sample_narration_dong_son_en.mp3');
  if (!fs.existsSync(dummyNarrationFile)) {
    fs.writeFileSync(dummyNarrationFile, Buffer.alloc(1024, 0));
  }

  // Cập nhật trạng thái dự án
  await Project.updateOne({ _id: project._id }, { status: 'COMPLETED', progress: 100 });

  const totalResults = await Result.countDocuments();
  const totalTransSegs = await TranslationSegment.countDocuments();
  console.log(`\n=== TỔNG KẾT SAU KHI SEED ===`);
  console.log(`- Collection results: ${totalResults} documents`);
  console.log(`- Collection translationsegments: ${totalTransSegs} documents`);
  console.log('=============================\n');
};

if (process.argv[1]?.includes('seed-mock-pipeline-data')) {
  connectDatabase(env.mongoUri)
    .then(async () => {
      await seedMockPipelineData();
    })
    .catch((err: unknown) => {
      console.error('Lỗi khi seed pipeline data:', err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(disconnectDatabase);
}
