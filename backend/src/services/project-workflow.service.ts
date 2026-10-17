import { Types } from 'mongoose';
import type { MediaType, ProjectStatus } from '../constants/project.constants.js';
import type { ProcessingJobStatus, ProcessingJobType } from '../constants/processing-job.constants.js';
import { Media } from '../models/Media.js';
import { Narration } from '../models/Narration.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Result } from '../models/Result.js';
import { Transcript } from '../models/Transcript.js';
import { Translation } from '../models/Translation.js';

export type WorkflowStep = 'UPLOAD' | 'TRANSCRIPT' | 'TRANSLATION' | 'VOICE' | 'GENERATE' | 'RESULT' | 'UNKNOWN';
export type WorkflowState = 'READY' | 'PROCESSING' | 'FAILED' | 'COMPLETED' | 'BLOCKED';
export type TargetLanguageSource = 'JOB' | 'TRANSLATION' | 'NARRATION' | 'RESULT';

export interface ProjectWorkflowSummary {
  step: WorkflowStep;
  state: WorkflowState;
  canResume: boolean;
  mediaType: MediaType | null;
  targetLanguage: { code: string; source: TargetLanguageSource } | null;
  processing: {
    jobId: string;
    type: ProcessingJobType;
    status: Extract<ProcessingJobStatus, 'QUEUED' | 'PROCESSING'>;
    progress: number;
  } | null;
  failure: {
    jobId: string;
    type: ProcessingJobType;
    code: string;
    failedAt: string;
  } | null;
  artifact: { narrationReady: boolean; resultReady: boolean };
}

export interface WorkflowProjectInput { id: string; status: ProjectStatus }
export interface WorkflowMediaRecord { projectId: string; mediaType: MediaType }
export interface WorkflowTranscriptRecord { projectId: string }
export interface WorkflowTranslationRecord { projectId: string; targetLanguage: string }
export interface WorkflowNarrationRecord { id: string; projectId: string; languageCode: string }
export interface WorkflowResultRecord { projectId: string; languageCode: string }
export interface WorkflowJobRecord {
  id: string;
  projectId: string;
  type: ProcessingJobType;
  status: ProcessingJobStatus;
  progress: number;
  targetLanguage?: string;
  narrationId?: string;
  errorMessage?: string;
  completedAt?: Date;
}

export interface ProjectWorkflowEvidence {
  media: WorkflowMediaRecord | null;
  transcript: WorkflowTranscriptRecord | null;
  translations: WorkflowTranslationRecord[];
  narrations: WorkflowNarrationRecord[];
  results: WorkflowResultRecord[];
  latestJob: WorkflowJobRecord | null;
}

export interface ProjectWorkflowBatchReader {
  readMedia(projectIds: string[]): Promise<WorkflowMediaRecord[]>;
  readTranscripts(projectIds: string[]): Promise<WorkflowTranscriptRecord[]>;
  readTranslations(projectIds: string[]): Promise<WorkflowTranslationRecord[]>;
  readNarrations(projectIds: string[]): Promise<WorkflowNarrationRecord[]>;
  readResults(projectIds: string[]): Promise<WorkflowResultRecord[]>;
  readLatestJobs(projectIds: string[]): Promise<WorkflowJobRecord[]>;
}

const SAFE_FAILURE_CODES = new Set([
  'STT_NOT_CONFIGURED', 'STT_TIMEOUT', 'STT_INVALID_RESPONSE', 'STT_FILE_TOO_LARGE',
  'STT_INVALID_FILE', 'STT_INVALID_KEY', 'STT_MODEL_UNAVAILABLE', 'STT_QUOTA_EXCEEDED',
  'STT_PROVIDER_ERROR', 'TRANSLATION_NOT_CONFIGURED', 'TRANSLATION_INVALID_KEY',
  'TRANSLATION_MODEL_UNAVAILABLE', 'TRANSLATION_QUOTA_EXCEEDED', 'TRANSLATION_TIMEOUT',
  'TRANSLATION_NETWORK_ERROR', 'TRANSLATION_INVALID_RESPONSE', 'TRANSLATION_MAPPING_FAILED',
  'TRANSLATION_PROVIDER_ERROR', 'TRANSLATION_FORMAT_UNSUPPORTED', 'TRANSLATION_LANGUAGE_NOT_SUPPORTED',
  'TTS_NOT_CONFIGURED', 'TTS_TIMEOUT', 'TTS_INVALID_RESPONSE', 'TTS_TEXT_TOO_LARGE',
  'TTS_PROVIDER_ERROR', 'FFMPEG_NOT_AVAILABLE', 'MEDIA_PROCESSING_TIMEOUT',
  'MEDIA_PROCESSING_INVALID_OUTPUT', 'MEDIA_PROCESSING_FAILED',
]);

const normalizeLanguage = (value: string | undefined) => {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
};

const target = (code: string | undefined, source: TargetLanguageSource) => {
  const normalized = normalizeLanguage(code);
  return normalized ? { code: normalized, source } : null;
};

const stepForJob = (type: ProcessingJobType): WorkflowStep => ({
  TRANSCRIPTION: 'TRANSCRIPT', TRANSLATION: 'TRANSLATION', TTS: 'VOICE', VIDEO_PROCESSING: 'GENERATE',
})[type] as WorkflowStep;

const failureCode = (value: string | undefined) => value && SAFE_FAILURE_CODES.has(value) ? value : 'PROCESSING_FAILED';

const hasMatchingTranslation = (records: WorkflowTranslationRecord[], language: string | null) =>
  Boolean(language && records.some((item) => normalizeLanguage(item.targetLanguage) === language));

const matchingNarration = (records: WorkflowNarrationRecord[], language: string | null, narrationId?: string) => {
  if (narrationId) return records.find((item) => item.id === narrationId) ?? null;
  return language ? records.find((item) => normalizeLanguage(item.languageCode) === language) ?? null : null;
};

const unambiguousLanguage = <T>(records: T[], read: (record: T) => string) => {
  const languages = new Set(records.map((record) => normalizeLanguage(read(record))).filter((code): code is string => Boolean(code)));
  return languages.size === 1 ? [...languages][0] ?? null : null;
};

export const resolveProjectWorkflow = (
  project: WorkflowProjectInput,
  evidence: ProjectWorkflowEvidence,
): ProjectWorkflowSummary => {
  const mediaType = evidence.media?.mediaType ?? null;
  const artifact = { narrationReady: evidence.narrations.length > 0, resultReady: evidence.results.length > 0 };
  const blocked = (): ProjectWorkflowSummary => ({
    step: 'UNKNOWN', state: 'BLOCKED', canResume: false, mediaType,
    targetLanguage: null, processing: null, failure: null, artifact,
  });
  const ready = (step: WorkflowStep, targetLanguage: ProjectWorkflowSummary['targetLanguage'] = null): ProjectWorkflowSummary => ({
    step, state: step === 'RESULT' ? 'COMPLETED' : 'READY', canResume: true, mediaType,
    targetLanguage, processing: null, failure: null, artifact,
  });
  const processing = (step: WorkflowStep, language: ProjectWorkflowSummary['targetLanguage'] = null): ProjectWorkflowSummary => {
    const job = evidence.latestJob;
    if (!job || (job.status !== 'QUEUED' && job.status !== 'PROCESSING')) return blocked();
    return {
      step, state: 'PROCESSING', canResume: true, mediaType, targetLanguage: language,
      processing: { jobId: job.id, type: job.type, status: job.status, progress: job.progress },
      failure: null, artifact,
    };
  };

  switch (project.status) {
    case 'DRAFT':
      return evidence.media ? blocked() : ready('UPLOAD');
    case 'UPLOADED':
      return evidence.media ? ready('TRANSCRIPT') : blocked();
    case 'TRANSCRIBING':
      return evidence.media && evidence.latestJob?.type === 'TRANSCRIPTION'
        ? processing('TRANSCRIPT') : blocked();
    case 'TRANSCRIBED':
      return evidence.media && evidence.transcript ? ready('TRANSLATION') : blocked();
    case 'TRANSLATING': {
      const language = target(evidence.latestJob?.targetLanguage, 'JOB');
      return evidence.media && evidence.transcript && evidence.latestJob?.type === 'TRANSLATION' && language
        ? processing('TRANSLATION', language) : blocked();
    }
    case 'TRANSLATED': {
      const language = unambiguousLanguage(evidence.translations, (item) => item.targetLanguage);
      return evidence.media && language ? ready('VOICE', target(language, 'TRANSLATION')) : blocked();
    }
    case 'GENERATING_AUDIO': {
      if (!evidence.media) return blocked();
      if (evidence.latestJob?.type === 'TTS' && (evidence.latestJob.status === 'QUEUED' || evidence.latestJob.status === 'PROCESSING')) {
        const language = target(evidence.latestJob.targetLanguage, 'JOB');
        return language && hasMatchingTranslation(evidence.translations, language.code)
          ? processing('VOICE', language) : blocked();
      }
      const completedJobLanguage = evidence.latestJob?.type === 'TTS' && evidence.latestJob.status === 'COMPLETED'
        ? normalizeLanguage(evidence.latestJob.targetLanguage) : null;
      const narrationLanguage = completedJobLanguage ?? unambiguousLanguage(evidence.narrations, (item) => item.languageCode);
      const narration = matchingNarration(evidence.narrations, narrationLanguage);
      if (!narration || !narrationLanguage) return blocked();
      const language = target(narrationLanguage, completedJobLanguage ? 'JOB' : 'NARRATION');
      return mediaType === 'VIDEO' ? ready('GENERATE', language) : ready('RESULT', language);
    }
    case 'PROCESSING_VIDEO': {
      const job = evidence.latestJob;
      const language = target(job?.targetLanguage, 'JOB');
      const narration = matchingNarration(evidence.narrations, language?.code ?? null, job?.narrationId);
      return mediaType === 'VIDEO' && job?.type === 'VIDEO_PROCESSING' && language && narration
        ? processing('GENERATE', language) : blocked();
    }
    case 'COMPLETED': {
      if (evidence.results.length > 0) {
        const language = unambiguousLanguage(evidence.results, (item) => item.languageCode);
        return language ? ready('RESULT', target(language, 'RESULT')) : blocked();
      }
      const language = unambiguousLanguage(evidence.narrations, (item) => item.languageCode);
      return mediaType === 'AUDIO' && language ? ready('RESULT', target(language, 'NARRATION')) : blocked();
    }
    case 'FAILED': {
      const job = evidence.latestJob;
      if (!job || job.status !== 'FAILED' || !job.completedAt) return blocked();
      const language = normalizeLanguage(job.targetLanguage);
      const prerequisitesAreValid = job.type === 'TRANSCRIPTION'
        ? Boolean(evidence.media)
        : job.type === 'TRANSLATION'
          ? Boolean(evidence.media && evidence.transcript && language)
          : job.type === 'TTS'
            ? Boolean(evidence.media && language && hasMatchingTranslation(evidence.translations, language))
            : Boolean(mediaType === 'VIDEO' && language && matchingNarration(evidence.narrations, language, job.narrationId));
      if (!prerequisitesAreValid) return blocked();
      return {
        step: stepForJob(job.type), state: 'FAILED', canResume: true, mediaType,
        targetLanguage: target(job.targetLanguage, 'JOB'), processing: null,
        failure: { jobId: job.id, type: job.type, code: failureCode(job.errorMessage), failedAt: job.completedAt.toISOString() },
        artifact,
      };
    }
  }
};

const objectIds = (projectIds: string[]) => projectIds.map((id) => new Types.ObjectId(id));

const mongoBatchReader: ProjectWorkflowBatchReader = {
  async readMedia(projectIds) {
    const rows = await Media.find({ projectId: { $in: objectIds(projectIds) } }).select('projectId mediaType').lean();
    return rows.map((row) => ({ projectId: String(row.projectId), mediaType: row.mediaType }));
  },
  async readTranscripts(projectIds) {
    const rows = await Transcript.find({ projectId: { $in: objectIds(projectIds) }, status: 'READY' }).select('projectId').lean();
    return rows.map((row) => ({ projectId: String(row.projectId) }));
  },
  async readTranslations(projectIds) {
    const rows = await Translation.find({ projectId: { $in: objectIds(projectIds) }, status: 'READY' })
      .sort({ updatedAt: -1, _id: -1 }).select('projectId targetLanguage').lean();
    return rows.map((row) => ({ projectId: String(row.projectId), targetLanguage: row.targetLanguage }));
  },
  async readNarrations(projectIds) {
    const rows = await Narration.find({ projectId: { $in: objectIds(projectIds) }, status: 'READY' })
      .sort({ updatedAt: -1, _id: -1 }).select('projectId languageCode').lean();
    return rows.map((row) => ({ id: String(row._id), projectId: String(row.projectId), languageCode: row.languageCode }));
  },
  async readResults(projectIds) {
    const rows = await Result.find({ projectId: { $in: objectIds(projectIds) } })
      .sort({ updatedAt: -1, _id: -1 }).select('projectId languageCode').lean();
    return rows.map((row) => ({ projectId: String(row.projectId), languageCode: row.languageCode }));
  },
  async readLatestJobs(projectIds) {
    const rows = await ProcessingJob.aggregate<{ job: {
      _id: Types.ObjectId; projectId: Types.ObjectId; type: ProcessingJobType; status: ProcessingJobStatus;
      progress: number; targetLanguage?: string; narrationId?: Types.ObjectId; errorMessage?: string; completedAt?: Date;
    } }>([
      { $match: { projectId: { $in: objectIds(projectIds) } } },
      { $sort: { projectId: 1, createdAt: -1, _id: -1 } },
      { $group: { _id: '$projectId', job: { $first: '$$ROOT' } } },
    ]);
    return rows.map(({ job }) => ({
      id: String(job._id), projectId: String(job.projectId), type: job.type, status: job.status,
      progress: job.progress, targetLanguage: job.targetLanguage,
      narrationId: job.narrationId ? String(job.narrationId) : undefined,
      errorMessage: job.errorMessage, completedAt: job.completedAt,
    }));
  },
};

const groupByProject = <T extends { projectId: string }>(rows: T[]) => {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const existing = grouped.get(row.projectId);
    if (existing) existing.push(row);
    else grouped.set(row.projectId, [row]);
  }
  return grouped;
};

export const resolveProjectWorkflows = async (
  projects: WorkflowProjectInput[],
  reader: ProjectWorkflowBatchReader = mongoBatchReader,
) => {
  const projectIds = projects.map((project) => project.id);
  if (projectIds.length === 0) return new Map<string, ProjectWorkflowSummary>();
  const [media, transcripts, translations, narrations, results, jobs] = await Promise.all([
    reader.readMedia(projectIds), reader.readTranscripts(projectIds), reader.readTranslations(projectIds),
    reader.readNarrations(projectIds), reader.readResults(projectIds), reader.readLatestJobs(projectIds),
  ]);
  const mediaByProject = new Map(media.map((item) => [item.projectId, item]));
  const transcriptByProject = new Map(transcripts.map((item) => [item.projectId, item]));
  const translationsByProject = groupByProject(translations);
  const narrationsByProject = groupByProject(narrations);
  const resultsByProject = groupByProject(results);
  const jobByProject = new Map(jobs.map((item) => [item.projectId, item]));
  return new Map(projects.map((project) => [project.id, resolveProjectWorkflow(project, {
    media: mediaByProject.get(project.id) ?? null,
    transcript: transcriptByProject.get(project.id) ?? null,
    translations: translationsByProject.get(project.id) ?? [],
    narrations: narrationsByProject.get(project.id) ?? [],
    results: resultsByProject.get(project.id) ?? [],
    latestJob: jobByProject.get(project.id) ?? null,
  })]));
};
