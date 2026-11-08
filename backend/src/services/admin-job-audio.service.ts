import { ProcessingJob } from '../models/ProcessingJob.js';
import { Narration } from '../models/Narration.js';
import { getAudio } from './narration.service.js';
import { AppError } from '../utils/app-error.js';

// GET only: no repair/backfill, generation, approval or job-state mutation.
export async function getAdminJobAudio(id: string) {
  const job = await ProcessingJob.findById(id);
  const unavailable = () => new AppError(404, 'JOB_AUDIO_UNAVAILABLE', 'Không có audio xác thực cho công việc này.');
  if (!job || job.type !== 'TTS' || job.status !== 'COMPLETED' || !job.sourceTranslationId ||
    !job.voiceId || !job.targetLanguage || !Number.isInteger(job.sourceTranslationRevision)) throw unavailable();
  if (!job.startedAt || !job.completedAt || job.completedAt < job.startedAt) throw unavailable();
  // Legacy jobs lack narrationId: require a unique artifact with the same
  // source revision, voice, language and original execution window.
  const matches = await Narration.find({
    ...(job.narrationId ? { _id: job.narrationId } : {}),
    projectId: job.projectId, translationId: job.sourceTranslationId,
    sourceTranslationRevision: job.sourceTranslationRevision, voiceId: job.voiceId,
    languageCode: job.targetLanguage, status: 'READY',
    createdAt: { $gte: job.startedAt, $lte: job.completedAt },
  }).select('_id').limit(2);
  if (matches.length !== 1) throw unavailable();
  // Existing read path checks current upstream provenance and file availability.
  return getAudio(String(job.projectId), String(matches[0]!._id));
}
