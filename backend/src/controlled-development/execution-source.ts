import { Project } from '../models/Project.js';
import { Language } from '../models/Language.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Translation } from '../models/Translation.js';
import { User } from '../models/User.js';
import { loadSource } from '../services/translation/group-translation.service.js';
import { candidateGroups, validatePlan, revision } from '../services/translation/group-plan.js';
import type { GroupAdmission } from '../services/translation/group-admission.js';
import type { OneUsePermitFence } from '../services/translation/one-use-permit.js';
import { assertDispatchScope } from '../services/translation/controlled-development.js';
import { AppError } from '../utils/app-error.js';

// Called again at each permitted SDK stage, not merely on startup/HTTP entry.
export async function verifyExecutionSource(fence: OneUsePermitFence, admission: GroupAdmission) {
  assertDispatchScope(fence);
  const p = fence.permit;
  const [project, language, activeJob, availableOwner] = await Promise.all([
    Project.findOne({ _id: p.projectId, userId: p.ownerId }).select('_id status sourceLanguage'),
    Language.exists({ code: 'en', isActive: true }),
    ProcessingJob.exists({ projectId: p.projectId, status: { $in: ['QUEUED', 'PROCESSING'] } }),
    User.exists({ _id: p.ownerId, deletedAt: null, role: 'CUSTOMER', status: 'ACTIVE' }),
  ]);
  if (!project || !availableOwner) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  if (!['TRANSCRIBED', 'TRANSLATED', 'FAILED'].includes(project.status) || project.sourceLanguage !== 'vi' || !language || activeJob) throw new AppError(409, 'CONTROLLED_SOURCE_BLOCKED', 'Nguồn chưa đủ điều kiện cho lần dịch được cấp phép.');
  const source = await loadSource(p.projectId, null, admission); // Exact pinned revision/digest + final revision recheck.
  if (await Translation.exists({ transcriptId: source.transcriptId, targetLanguage: 'en' })) throw new AppError(409, 'TRANSLATION_ALREADY_EXISTS', 'Không ghi đè bản dịch hiện có.');
  const groups = validatePlan(source, candidateGroups(source).map(g => g.sourceSegmentIds));
  fence.assertInput(p.model, { fullText: source.fullText, sourceLanguage: 'vi', targetLanguage: 'en', groups: groups.map(g => ({ groupId: g.groupId, sourceText: g.sourceText })) });
  return { revision: source.transcriptRevision, digest: revision(source), segmentCount: source.segments.length, groupCount: groups.length, coverage: groups.reduce((n, g) => n + g.sourceSegmentIds.length, 0) };
}
