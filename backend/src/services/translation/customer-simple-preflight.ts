import { AppError } from '../../utils/app-error.js';
import { Project } from '../../models/Project.js';
import { Translation } from '../../models/Translation.js';
import { ProcessingJob } from '../../models/ProcessingJob.js';
import { loadSource } from './group-translation.service.js';
import { candidateGroups, revision } from './group-plan.js';
import { customerAttempts } from './customer-attempt.js';
import { groupDraftStore } from './group-draft-store.js';
import { assertSimpleInput, translationProviderInput, SIMPLE_INPUT_BYTES, SIMPLE_GROUP_BYTES, SIMPLE_GROUP_LIMIT } from './gemini-simple-contract.js';
import { SOURCE_BYTE_LIMIT, SOURCE_SEGMENT_LIMIT } from './bounded-source.js';
import { customerTranslationMethod } from '../../config/customer-translation-method.js';
import { readCustomerQuota, readDeploymentIdentity, readDurableProjectConflict } from './preflight-runtime-evidence.js';

const dependencies = {
  owns: async (projectId: string, ownerId: string) => Boolean(await Project.findOne({ _id: projectId, userId: ownerId }).select('_id')),
  load: loadSource,
  attempt: customerAttempts.inspect.bind(customerAttempts),
  english: async (projectId: string) => Boolean(await Translation.exists({ projectId, targetLanguage: 'en' })),
  // Same broad active-job guard as normal Customer generation (includes STT/TTS).
  jobs: async (projectId: string) => Boolean(await ProcessingJob.exists({ projectId, status: { $in: ['QUEUED', 'PROCESSING'] } })),
  drafts: (projectId: string) => groupDraftStore.inspectConflicts(projectId, 'en'),
  quota: readCustomerQuota,
  deployment: readDeploymentIdentity,
  durableConflicts: readDurableProjectConflict,
};

export async function customerSimplePreflight(projectId: string, ownerId: string, deps = dependencies) {
  if (process.env.NODE_ENV !== 'development' || !/^[a-f\d]{24}$/i.test(projectId)) throw new AppError(404, 'DIAGNOSTIC_NOT_AVAILABLE', 'Kiểm tra chỉ khả dụng trong development.');
  if (!await deps.owns(projectId, ownerId)) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Dự án không khả dụng.');
  let method: string = 'NOT VERIFIED';
  try { method = customerTranslationMethod(); } catch { /* Do not expose env/errors. */ }
  const base = {
    contract: 'CUSTOMER_SIMPLE_PREFLIGHT_V1', status: 'BLOCKED', generationAuthorized: false,
    transcript: 'NOT VERIFIED', revision: null as number | null, sourceDigest: null as string | null,
    sourceBytes: null as number | null, inputBytes: null as number | null, maxGroupBytes: null as number | null,
    segments: null as number | null, groups: null as number | null, orderedCoverage: 'NOT VERIFIED',
    limits: { groups: SIMPLE_GROUP_LIMIT, groupBytes: SIMPLE_GROUP_BYTES, inputBytes: SIMPLE_INPUT_BYTES, sourceBytes: SOURCE_BYTE_LIMIT, segments: SOURCE_SEGMENT_LIMIT },
    simpleLimits: 'NOT VERIFIED', attempt: 'NOT VERIFIED', attemptStatus: null as string | null,
    persistedEnglish: 'NOT VERIFIED', activeJobs: 'NOT VERIFIED',
    drafts: { visibility: 'PROCESS_LOCAL_ONLY', count: null as number | null, globalAbsence: 'UNKNOWN' },
    quota: 'NOT VERIFIED', runtime: { method, customerEnabled: process.env.CUSTOMER_TRANSLATION_ENABLED === 'true', thinkingDefault: (process.env.CUSTOMER_TRANSLATION_THINKING ?? 'DEFAULT') === 'DEFAULT', deploymentIdentity: 'NOT VERIFIED' },
    reasonCodes: ['QUOTA_NOT_VERIFIED', 'DEPLOYMENT_NOT_VERIFIED'],
  };
  try {
    const [source, english, jobs] = await Promise.all([deps.load(projectId), deps.english(projectId), deps.jobs(projectId)]);
    const groups = candidateGroups(source), digest = revision(source);
    const input = translationProviderInput(source, 'en', groups);
    const attempt = await deps.attempt({ ownerId, projectId, sourceRevision: digest, targetLanguage: 'en' });
    const localDrafts = deps.drafts(projectId);
    // Evidence failures are independent and sanitized, not permission to proceed.
    const [quotaEvidence, deploymentEvidence, crossProcess] = await Promise.all([
      Promise.resolve().then(() => deps.quota(ownerId)).catch(() => null),
      Promise.resolve().then(() => deps.deployment()).catch(() => null),
      Promise.resolve().then(() => deps.durableConflicts(projectId, ownerId)).catch(() => null),
    ]);
    const current = Number.isSafeInteger(source.transcriptRevision) && source.transcriptRevision! > 0 && source.languageCode === 'vi';
    const ids = groups.flatMap(g => g.sourceSegmentIds);
    const covered = ids.length === source.segments.length && ids.every((id, i) => id === source.segments[i]?.id);
    let simple = 'PASS';
    try { assertSimpleInput(input); } catch { simple = 'FAIL'; }
    // Detect concurrent edits while reading attempt/conflict evidence. Never claim
    // a transactional readiness guarantee; execution will recheck all guards.
    const after = await deps.load(projectId);
    if (revision(after) !== digest) return { ...base, reasonCodes: [...base.reasonCodes, 'SOURCE_REVISION_MISMATCH'] };
    const blocked = [
      ...(current ? [] : ['SOURCE_NOT_CURRENT']), ...(covered ? [] : ['GROUP_COVERAGE_MISMATCH']),
      ...(simple === 'PASS' ? [] : ['TRANSLATION_SIMPLE_INPUT_LIMIT']),
      ...(attempt || english || jobs || (typeof localDrafts.count === 'number' && localDrafts.count > 0) || crossProcess?.status === 'BLOCKED' ? ['TRANSLATION_CONFLICT'] : []),
      ...(quotaEvidence?.status === 'VERIFIED' && !quotaEvidence.available ? ['QUOTA_EXHAUSTED'] : []),
      ...(deploymentEvidence?.intendedTargetApproval === 'MISMATCH' ? ['DEPLOYMENT_TARGET_MISMATCH'] : []),
      ...(method === 'GEMINI_SIMPLE_V1' && base.runtime.customerEnabled && base.runtime.thinkingDefault && !process.env.CONTROLLED_PROVIDER_MODE && (process.env.TRANSLATION_PROVIDER?.trim().toLowerCase() || 'gemini') === 'gemini' ? [] : ['SIMPLE_RUNTIME_NOT_ENABLED']),
    ];
    const unknown = [
      ...(quotaEvidence?.status === 'VERIFIED' ? [] : ['QUOTA_NOT_VERIFIED']),
      ...(deploymentEvidence?.status === 'VERIFIED' && deploymentEvidence.intendedTargetApproval === 'APPROVED_BY_USER' && deploymentEvidence.approvedDatabaseMatch === true ? [] : ['DEPLOYMENT_NOT_VERIFIED']),
      ...(crossProcess?.status === 'CLEAR' || crossProcess?.status === 'BLOCKED' ? [] : ['DURABLE_CONFLICT_UNKNOWN']),
      ...(localDrafts.count === 0 || (typeof localDrafts.count === 'number' && localDrafts.count > 0) ? [] : ['LOCAL_DRAFTS_UNKNOWN']),
    ];
    // READY is a point-in-time NORMAL CUSTOMER durable-path preflight, not a
    // claim/permission or proof that arbitrary RAM drafts globally do not exist.
    // Those drafts remain UNKNOWN, with duplicate/approval races enforced by the
    // existing durable attempt key and transactional approval at execution time.
    const status = blocked.length ? 'BLOCKED' : unknown.length ? 'UNKNOWN' : 'READY';
    return { ...base, status, readyForManualExecution: status === 'READY', readinessScope: 'NORMAL_CUSTOMER_DURABLE_PATH', warnings: ['OTHER_PROCESS_RAM_DRAFTS_UNKNOWN', 'POINT_IN_TIME_RECHECK_AT_EXECUTION'], transcript: current ? 'PASS' : 'FAIL', revision: source.transcriptRevision ?? null, sourceDigest: digest,
      sourceBytes: Buffer.byteLength(JSON.stringify(source)), inputBytes: Buffer.byteLength(JSON.stringify(input)),
      maxGroupBytes: Math.max(0, ...groups.map(g => Buffer.byteLength(g.sourceText))), segments: source.segments.length, groups: groups.length,
      orderedCoverage: covered ? `${ids.length}/${source.segments.length}` : 'FAIL', simpleLimits: simple,
      attempt: attempt ? 'BLOCKED' : 'CLEAR', attemptStatus: attempt?.status ?? null,
      persistedEnglish: english ? 'BLOCKED' : 'CLEAR', activeJobs: jobs ? 'BLOCKED' : 'CLEAR', drafts: localDrafts,
      quota: quotaEvidence ? 'VERIFIED' : 'NOT VERIFIED', quotaEvidence,
      runtime: { ...base.runtime, deploymentIdentity: deploymentEvidence ? 'VERIFIED' : 'NOT VERIFIED', deploymentEvidence },
      crossProcess: crossProcess ?? { status: 'UNKNOWN', scope: 'DURABLE_CUSTOMER_ATTEMPTS_ALL_REVISIONS', ramOtherProcesses: 'UNKNOWN' },
      reasonCodes: [...blocked, ...unknown],
    };
  } catch (error) {
    const safe = ['TRANSCRIPT_NOT_FOUND', 'TRANSCRIPT_REVISION_UNAVAILABLE', 'SOURCE_REVISION_MISMATCH', 'TRANSLATION_DRAFT_TOO_LARGE'];
    return { ...base, reasonCodes: [...base.reasonCodes, error instanceof AppError && safe.includes(error.code) ? error.code : 'PREFLIGHT_UNAVAILABLE'] };
  }
}
