// Read-only STT diagnostics. Never submits a provider request or modifies records.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { access, constants, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

dotenv.config({ quiet: true });
for (const key of ['MONGODB_URI', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'STT_PROVIDER', 'STT_MODEL', 'GEMINI_STT_MODEL']) {
  console.log(`${key}: ${process.env[key]?.trim() ? 'PRESENT' : 'MISSING'}`);
}
const provider = process.env.STT_PROVIDER?.trim() || 'gemini';
console.log('Provider supported:', ['gemini', 'openai'].includes(provider));
console.log('Gemini selected:', provider === 'gemini');
console.log('Selected provider key present:', Boolean((provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY)?.trim()));
console.log('Selected model format compatible:', provider === 'gemini' ? !process.env.GEMINI_STT_MODEL || process.env.GEMINI_STT_MODEL === 'gemini-3.5-transcribe' : !process.env.STT_MODEL || process.env.STT_MODEL === 'whisper-1');
console.log('Development diagnostics enabled:', !process.env.NODE_ENV || process.env.NODE_ENV === 'development');

if (process.argv.includes('--database')) {
  try {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) throw new Error('MISSING_CONFIGURATION');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000, autoIndex: false, autoCreate: false });
    console.log('Database read connection: PASS');
    const jobs = await mongoose.connection.collection('processingjobs').find({ type: 'TRANSCRIPTION' }).sort({ createdAt: -1 }).limit(3).toArray();
    for (const job of jobs) {
      const project = await mongoose.connection.collection('projects').findOne({ _id: job.projectId });
      const media = await mongoose.connection.collection('media').findOne({ projectId: job.projectId });
      const transcript = await mongoose.connection.collection('transcripts').findOne({ projectId: job.projectId });
      const safeCode = typeof job.errorMessage === 'string' && /^STT_[A-Z_]+$/.test(job.errorMessage) ? job.errorMessage : job.errorMessage ? 'OTHER_ERROR' : null;
      console.log({ jobStatus: job.status, projectStatus: project?.status, errorCode: safeCode, languageVietnamese: project?.sourceLanguage === 'vi', mediaPresent: Boolean(media), mimeType: ['audio/mpeg', 'video/mp4'].includes(media?.mimeType) ? media?.mimeType : 'OTHER', transcriptPresent: Boolean(transcript) });
      if (!media || typeof media.storagePath !== 'string') continue;
      const root = resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
      const file = resolve(root, media.storagePath);
      const pathWithinRoot = relative(root, file);
      if (pathWithinRoot === '..' || pathWithinRoot.startsWith(`..${sep}`) || isAbsolute(pathWithinRoot)) { console.log('Storage containment: FAIL'); continue; }
      try {
        await access(file, constants.R_OK);
        const info = await stat(file);
        console.log({ fileReadable: true, isFile: info.isFile(), bytes: info.size, withinSttLimit: info.size <= (provider === 'gemini' ? 500 : 25) * 1024 * 1024 });
        try {
          const { stdout } = await promisify(execFile)(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name:format=duration', '-of', 'json', file], { timeout: 10_000 });
          const probe = JSON.parse(stdout) as { streams?: Array<{ codec_type?: string; codec_name?: string }>; format?: { duration?: string } };
          console.log({ ffprobeValid: true, hasAudio: probe.streams?.some((s) => s.codec_type === 'audio'), mp3Codec: probe.streams?.some((s) => s.codec_name === 'mp3'), durationSeconds: Number(probe.format?.duration) || null });
        } catch { console.log('FFprobe validation: NOT VERIFIED (probe failed or unavailable)'); }
      } catch { console.log('File read/stat: FAIL'); }
    }
    console.log('Records inspected:', jobs.length);
  } catch { console.log('Database read connection/query: FAIL (details suppressed to protect credentials)'); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}
