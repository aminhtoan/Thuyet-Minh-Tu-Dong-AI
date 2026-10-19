import mongoose, { type ClientSession, Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { AuthSession } from '../models/AuthSession.js';
import { Media } from '../models/Media.js';
import { Narration } from '../models/Narration.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Project } from '../models/Project.js';
import { Result } from '../models/Result.js';
import { Transcript } from '../models/Transcript.js';
import { TranscriptSegment } from '../models/TranscriptSegment.js';
import { Translation } from '../models/Translation.js';
import { TranslationSegment } from '../models/TranslationSegment.js';
import { User } from '../models/User.js';
import { availableUserFilter } from './user-availability.js';

export interface CustomerCleanupCandidate {
  id: string;
  fullName: 'S24 Disposable Customer';
  email: string;
  expectedActivityLogs: number;
}

export const CUSTOMER_SOFT_DELETE_ALLOWLIST = Object.freeze([
  { id: '6ac8e59c475fd1db52cd5d3c', fullName: 'S24 Disposable Customer', email: 's2421-1791550874563@example.test', expectedActivityLogs: 26 },
  { id: '6ac8e5af475fd1db52cd5d66', fullName: 'S24 Disposable Customer', email: 's2421-1791550895061@example.test', expectedActivityLogs: 27 },
  { id: '6ac8ef4684b5977f9b48f23f', fullName: 'S24 Disposable Customer', email: 's2421-1791553349689@example.test', expectedActivityLogs: 27 },
] satisfies readonly CustomerCleanupCandidate[]);

export interface CustomerCleanupDependencyCounts {
  projects: number;
  media: number;
  transcripts: number;
  transcriptSegments: number;
  translations: number;
  translationSegments: number;
  narrations: number;
  results: number;
  processingJobs: number;
  authSessions: number;
}

export interface CustomerCleanupSnapshot {
  candidate: CustomerCleanupCandidate;
  userMatches: boolean;
  alreadyDeleted: boolean;
  activityLogs: number;
  activityActorReferences: number;
  historicalProjectIds: number;
  dependencies: CustomerCleanupDependencyCounts;
}

const expectedFixtureEmail = /^s2421-\d+@example\.test$/;
const zeroDependencies = (counts: CustomerCleanupDependencyCounts) => Object.values(counts).every((count) => count === 0);

export const validateCleanupAllowlist = (candidates: readonly CustomerCleanupCandidate[]): void => {
  if (candidates.length !== 3 || new Set(candidates.map((item) => item.id)).size !== 3) throw new Error('CUSTOMER_CLEANUP_ALLOWLIST_INVALID');
  for (const candidate of candidates) {
    if (!Types.ObjectId.isValid(candidate.id) || candidate.fullName !== 'S24 Disposable Customer' || !expectedFixtureEmail.test(candidate.email)) {
      throw new Error('CUSTOMER_CLEANUP_ALLOWLIST_INVALID');
    }
  }
};

export const validateCleanupSnapshot = (snapshot: CustomerCleanupSnapshot): void => {
  if (!snapshot.userMatches) throw new Error('CUSTOMER_CLEANUP_IDENTITY_MISMATCH');
  if (snapshot.alreadyDeleted) throw new Error('CUSTOMER_ALREADY_SOFT_DELETED');
  if (!zeroDependencies(snapshot.dependencies)) throw new Error('CUSTOMER_CLEANUP_DEPENDENCIES_FOUND');
  if (snapshot.activityLogs !== snapshot.candidate.expectedActivityLogs || snapshot.activityActorReferences !== snapshot.activityLogs) {
    throw new Error('CUSTOMER_CLEANUP_ACTIVITY_LOG_MISMATCH');
  }
};

const uniqueObjectIds = (values: Types.ObjectId[]) => [...new Map(values.map((value) => [value.toString(), value])).values()];

export const inspectCustomerCleanupCandidate = async (
  candidate: CustomerCleanupCandidate,
  session: ClientSession | null = null,
): Promise<CustomerCleanupSnapshot> => {
  const id = new Types.ObjectId(candidate.id);
  const user = await User.findById(id).select('fullName email role deletedAt').session(session).lean();
  const userMatches = Boolean(user && user.role === 'CUSTOMER' && user.fullName === candidate.fullName && user.email === candidate.email);
  const projects = await Project.find({ userId: id }).select('_id').session(session).lean();
  const activityProjectReferences = await ActivityLog.find({ userId: id, entityType: 'Project' }).select('entityId').session(session).lean();
  const projectIds = uniqueObjectIds([
    ...projects.map((item) => item._id),
    ...activityProjectReferences.map((item) => item.entityId),
  ]);
  const transcripts = await Transcript.find({ projectId: { $in: projectIds } }).select('_id').session(session).lean();
  const translations = await Translation.find({ projectId: { $in: projectIds } }).select('_id').session(session).lean();
  const transcriptIds = transcripts.map((item) => item._id);
  const translationIds = translations.map((item) => item._id);
  const [media, transcriptSegments, translationSegments, narrations, results, processingJobs, authSessions, activityLogs] = await Promise.all([
    Media.countDocuments({ projectId: { $in: projectIds } }).session(session),
    TranscriptSegment.countDocuments({ transcriptId: { $in: transcriptIds } }).session(session),
    TranslationSegment.countDocuments({ translationId: { $in: translationIds } }).session(session),
    Narration.countDocuments({ projectId: { $in: projectIds } }).session(session),
    Result.countDocuments({ projectId: { $in: projectIds } }).session(session),
    ProcessingJob.countDocuments({ projectId: { $in: projectIds } }).session(session),
    AuthSession.countDocuments({ userId: id }).session(session),
    ActivityLog.countDocuments({ userId: id }).session(session),
  ]);
  return {
    candidate,
    userMatches,
    alreadyDeleted: Boolean(user?.deletedAt),
    activityLogs,
    activityActorReferences: activityLogs,
    historicalProjectIds: projectIds.length,
    dependencies: {
      projects: projects.length,
      media,
      transcripts: transcripts.length,
      transcriptSegments,
      translations: translations.length,
      translationSegments,
      narrations,
      results,
      processingJobs,
      authSessions,
    },
  };
};

interface ExecuteCustomerSoftDeleteInput {
  deletedBy: string;
  deletedReason: string;
  maintenanceFence: 'ADMIN07.3_MAINTENANCE_CONFIRMED';
  now?: Date;
}

/**
 * Not exposed by any HTTP route. ADMIN07.3 may call this only after an encrypted
 * backup and an external maintenance fence have been independently verified.
 */
export const executeApprovedCustomerSoftDelete = async (input: ExecuteCustomerSoftDeleteInput): Promise<string[]> => {
  validateCleanupAllowlist(CUSTOMER_SOFT_DELETE_ALLOWLIST);
  if (input.maintenanceFence !== 'ADMIN07.3_MAINTENANCE_CONFIRMED') throw new Error('CUSTOMER_CLEANUP_MAINTENANCE_REQUIRED');
  if (!Types.ObjectId.isValid(input.deletedBy) || !input.deletedReason.trim() || input.deletedReason.length > 200) throw new Error('CUSTOMER_CLEANUP_INPUT_INVALID');
  const session = await mongoose.startSession();
  try {
    const deletedIds = await session.withTransaction(async () => {
      const admin = await User.findOne(availableUserFilter({ _id: input.deletedBy, role: 'ADMIN', status: 'ACTIVE' })).session(session);
      if (!admin) throw new Error('CUSTOMER_CLEANUP_ADMIN_INVALID');
      const now = input.now ?? new Date();
      const completed: string[] = [];
      for (const candidate of CUSTOMER_SOFT_DELETE_ALLOWLIST) {
        const snapshot = await inspectCustomerCleanupCandidate(candidate, session);
        validateCleanupSnapshot(snapshot);
        const result = await User.updateOne(
          availableUserFilter({ _id: candidate.id, role: 'CUSTOMER', fullName: candidate.fullName, email: candidate.email }),
          { $set: { deletedAt: now, deletedReason: input.deletedReason.trim(), deletedBy: admin._id } },
          { session, runValidators: true },
        );
        if (result.matchedCount !== 1 || result.modifiedCount !== 1) throw new Error('CUSTOMER_CLEANUP_CONCURRENT_CHANGE');
        await ActivityLog.create([{
          userId: admin._id,
          action: 'CUSTOMER_SOFT_DELETED',
          entityType: 'User',
          entityId: new Types.ObjectId(candidate.id),
          description: 'Quản trị viên đã lưu trữ tài khoản kiểm thử đã được phê duyệt.',
        }], { session });
        completed.push(candidate.id);
      }
      return completed;
    });
    if (!deletedIds) throw new Error('CUSTOMER_CLEANUP_TRANSACTION_ABORTED');
    return deletedIds;
  } finally {
    await session.endSession();
  }
};
