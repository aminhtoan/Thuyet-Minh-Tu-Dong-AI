import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { Language } from '../models/Language.js';
import { Translation } from '../models/Translation.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Transcript } from '../models/Transcript.js';
import { loadSource } from '../services/translation/group-translation.service.js';
import { candidateGroups, validatePlan, revision, digest } from '../services/translation/group-plan.js';
import type { GroupAdmission } from '../services/translation/group-admission.js';
import { controlledPolicy } from '../services/translation/controlled-target.js';
import { AppError } from '../utils/app-error.js';
import { permitSchema } from '../services/translation/one-use-permit.js';
import { groupDraftStore } from '../services/translation/group-draft-store.js';

const dependencies = {
  project: (id: string, ownerId: string) => Project.findOne({ _id: id, userId: ownerId }).select('_id status sourceLanguage'),
  owner: (ownerId: string) => User.exists({ _id: ownerId, deletedAt: null, role: 'CUSTOMER', status: 'ACTIVE' }),
  language: () => Language.exists({ code: 'en', isActive: true }),
  jobs: (projectId: string) => ProcessingJob.exists({ projectId, status: { $in: ['QUEUED', 'PROCESSING'] } }),
  translation: (projectId: string) => Translation.exists({ projectId, targetLanguage: 'en' }),
  load: loadSource,
  current: (projectId: string, transcriptId: string) => Transcript.findOne({ _id: transcriptId, projectId }).select('_id revision'),
  drafts: (projectId: string) => groupDraftStore.inspectConflicts(projectId, 'en').count,
};
// Read-only preparation, NOT issuance. Owner comes from authenticated CUSTOMER;
// deploymentId must come from server-side hello/config attestation, never HTTP input.
export async function prepareExecutionBinding(projectId: string, ownerId: string, deploymentId: string, admission?: GroupAdmission, deps = dependencies) {
  if (process.env.NODE_ENV !== 'development' || !/^[a-f\d]{24}$/.test(projectId) || !/^[a-f\d]{24}$/.test(ownerId) || !/^[a-f\d]{64}$/.test(deploymentId)) throw new AppError(403, 'CONTROLLED_SCOPE_DENIED', 'Scope invalid');
  const [project, owner, language, jobs, translation] = await Promise.all([deps.project(projectId, ownerId), deps.owner(ownerId), deps.language(), deps.jobs(projectId), deps.translation(projectId)]);
  if (!project || !owner) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  if (!language || jobs || translation || deps.drafts(projectId) || project.sourceLanguage !== 'vi' || !['TRANSCRIBED', 'TRANSLATED', 'FAILED'].includes(project.status)) throw new AppError(409, 'CONTROLLED_SOURCE_BLOCKED', 'Nguồn chưa sẵn sàng hoặc có dữ liệu xung đột.');
  const source = await deps.load(projectId, null, admission);
  if (Buffer.byteLength(JSON.stringify(source)) > controlledPolicy.sourceBytes || source.segments.length > controlledPolicy.maxSegments) throw new AppError(413, 'TRANSLATION_DRAFT_TOO_LARGE', 'Dữ liệu lời thoại vượt giới hạn xử lý. Vui lòng sử dụng video ngắn hơn hoặc giảm lượng lời thoại rồi thử lại.');
  if (!Number.isSafeInteger(source.transcriptRevision) || source.transcriptRevision! < 1 || source.languageCode !== project.sourceLanguage) throw new AppError(409, 'SOURCE_REVISION_MISMATCH', 'Nguồn đã thay đổi.');
  const groups = validatePlan(source, candidateGroups(source).map(g => g.sourceSegmentIds));
  const current = await deps.current(projectId, source.transcriptId);
  if (!current || current.revision !== source.transcriptRevision) throw new AppError(409, 'SOURCE_REVISION_MISMATCH', 'Nguồn đã thay đổi.');
  const input = { fullText: source.fullText, sourceLanguage: 'vi', targetLanguage: 'en', groups: groups.map(g => ({ groupId: g.groupId, sourceText: g.sourceText })) };
  return Object.freeze({ ownerId, projectId, revision: source.transcriptRevision!, sourceDigest: revision(source), inputDigest: digest(input), planDigest: digest(input.groups.map(g => g.groupId)),
    sourceLanguage: 'vi' as const, targetLanguage: 'en' as const, model: controlledPolicy.model, deploymentId,
    segmentCount: source.segments.length, groupCount: groups.length, coverage: groups.reduce((n, g) => n + g.sourceSegmentIds.length, 0), sourceBytes: Buffer.byteLength(JSON.stringify(source)) });
}

// Pure validation before opening a durable fence. Does NOT issue a grant or write
// state. Operator approval/caps/expiry are checked separately from source truth.
export function assertPreparedPermit(grant: unknown, binding: Awaited<ReturnType<typeof prepareExecutionBinding>>, now = Date.now()) {
  const p = permitSchema.parse(grant);
  if (p.issuedAt > now || p.expiresAt <= now || p.expiresAt - p.issuedAt > 3600000 || (p.thinking === 'LOW' && !p.lowExplicitlyApproved)) throw new Error('PROVIDER_PERMIT_INVALID');
  for (const key of ['ownerId', 'projectId', 'revision', 'sourceDigest', 'inputDigest', 'planDigest', 'sourceLanguage', 'targetLanguage', 'model', 'deploymentId'] as const) {
    if (p[key] !== binding[key]) throw new Error('PROVIDER_PERMIT_BINDING_MISMATCH');
  }
  return p;
}
