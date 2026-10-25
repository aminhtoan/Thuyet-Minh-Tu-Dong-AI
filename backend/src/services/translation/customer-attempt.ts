import { TranslationAttempt } from '../../models/TranslationAttempt.js';
import { AppError } from '../../utils/app-error.js';
import { digest } from './group-plan.js';
import type { GroupDraft } from './group-draft-store.js';
import { GEMINI_TRANSLATION_ERRORS } from './gemini-translation.provider.js';
import { withCustomerExecution, type ExecutionPhase, type ExecutionTrace } from './customer-execution.js';
import { TranslationProviderFailure, providerFailureReason, type ProviderDiagnostic, type TransportDiagnostic } from './provider-failure.js';
import { customerTranslationQuota, type CustomerTranslationQuota } from '../../config/customer-translation-quota.js';

export type AttemptScope = { ownerId: string; projectId: string; targetLanguage: string; sourceRevision: string };
const uncertain = () => new AppError(409, 'TRANSLATION_ATTEMPT_UNCERTAIN', 'Yêu cầu dịch đã được nhận hoặc có kết quả chưa xác định. Chỉ tải lại dữ liệu, không tự gọi lại AI.');
const expired = () => new AppError(410, 'TRANSLATION_DRAFT_EXPIRED', 'Bản nháp đã hết hạn. Không tự động dịch lại.');
const key = (s: AttemptScope) => digest(['CUSTOMER_TRANSLATION_V1', s.ownerId, s.projectId, s.targetLanguage, s.sourceRevision]);
const safeCodes = new Set<string>([...GEMINI_TRANSLATION_ERRORS, 'TRANSLATION_ATTEMPT_FENCE_FAILED', 'TRANSLATION_QUOTA_UNAVAILABLE', 'TRANSLATION_INTERNAL_FAILURE', 'TRANSLATION_DAILY_LIMIT', 'TRANSLATION_DRAFT_TOO_LARGE', 'TRANSLATION_SOURCE_CHANGED', 'TRANSLATION_CONFLICT', 'TRANSLATION_DRAFT_CAPACITY', 'TRANSLATION_ATTEMPT_UNCERTAIN', 'TRANSLATION_DRAFT_CHANGED', 'TRANSCRIPT_REVISION_UNAVAILABLE']);
const safeCode = (error: unknown) => error instanceof AppError && safeCodes.has(error.code) ? error.code : 'TRANSLATION_INTERNAL_FAILURE';
export type CustomerAttemptStatus = { status: 'NOT_SENT' | 'PROCESSING' | 'DRAFT_SAVED' | 'EXPIRED' | 'FAILED_PRE_DISPATCH' | 'FAILED_RESPONSE' | 'UNCERTAIN'; phase: string; diagnosticCode: string | null; providerHttpStatus: number | null; updatedAt: string | null; canGenerate: false };
function statusOf(row: { state?: string; phase?: string; executionVersion?: number; diagnosticCode?: string; providerHttpStatus?: number; updatedAt?: Date | string; draftJson?: string }): CustomerAttemptStatus {
  const time = row.updatedAt ? new Date(row.updatedAt).getTime() : NaN;
  let status: CustomerAttemptStatus['status'] = 'UNCERTAIN';
  if (row.state === 'DRAFT') {
    try { const draft = JSON.parse(row.draftJson ?? '') as GroupDraft; status = Date.parse(draft.expiresAt) > Date.now() ? 'DRAFT_SAVED' : 'EXPIRED'; } catch { /* fail closed */ }
  } else if (row.state === 'FAILED_PRE_DISPATCH' || row.state === 'FAILED_RESPONSE') status = row.state;
  else if (row.executionVersion === 1 && row.state === 'CLAIMED' && Date.now() - time < 180000) status = row.phase === 'PREPARING' ? 'NOT_SENT' : 'PROCESSING';
  const providerHttpStatus = [400, 408, 429, 503, 504].includes(row.providerHttpStatus ?? 0) ? row.providerHttpStatus! : null;
  return { status, phase: row.executionVersion === 1 ? row.phase ?? 'UNKNOWN' : 'UNKNOWN', diagnosticCode: row.diagnosticCode && safeCodes.has(row.diagnosticCode) ? row.diagnosticCode : null, providerHttpStatus, updatedAt: Number.isFinite(time) ? new Date(time).toISOString() : null, canGenerate: false };
}
const repository = {
  claim: async (s: AttemptScope, binding: string) => {
    // Native collection insert uses built-in unique _id; no optional index dependency.
    await TranslationAttempt.collection.insertOne({ _id: key(s), ...s, binding, state: 'CLAIMED', executionVersion: 1, phase: 'PREPARING', createdAt: new Date(), updatedAt: new Date() } as never,
      { writeConcern: { w: 'majority', j: true } });
  },
  read: async (s: AttemptScope) => {
    const [row] = await TranslationAttempt.aggregate([{ $match: { _id: key(s) } }, { $project: { row: { $cond: [{ $lte: [{ $bsonSize: '$$ROOT' }, 140 * 1024] }, '$$ROOT', null] } } }]);
    if (row && !row.row) throw uncertain();
    return row?.row ?? null;
  },
  quota: async (s: AttemptScope, policy: CustomerTranslationQuota) => {
    const day = new Date().toISOString().slice(0, 10);
    const session = await TranslationAttempt.db.startSession().catch(() => {
      throw new AppError(503, 'TRANSLATION_QUOTA_UNAVAILABLE', 'Không xác nhận được hạn mức dịch. Chưa gọi Gemini; không tự thử lại.');
    });
    try {
      await session.withTransaction(async () => {
        const filter = { _id: key(s), state: 'CLAIMED', executionVersion: 1 };
        const row = await TranslationAttempt.collection.findOne(filter as never, { session, projection: { quotaReserved: 1 } });
        if (!row) throw uncertain();
        if (row.quotaReserved === true) return; // Durable per-attempt receipt, no double charge.
        for (const [id, cap] of [[`customer-day:${s.ownerId}:${day}`, policy.perUser], [`customer-global-day:${day}`, policy.global]] as const) {
          try {
            const result = await TranslationAttempt.collection.updateOne({ _id: id, count: { $lt: cap } } as never,
              { $inc: { count: 1 }, $setOnInsert: { kind: 'QUOTA' } } as never, { session, upsert: true });
            if (result.modifiedCount + result.upsertedCount !== 1) throw uncertain();
          } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw new AppError(429, 'TRANSLATION_DAILY_LIMIT', 'Đã hết lượt dịch trong ngày. Không tự thử lại.');
            throw error;
          }
        }
        const receipt = await TranslationAttempt.collection.updateOne({ ...filter, quotaReserved: { $ne: true } } as never,
          { $set: { quotaReserved: true, quotaDay: day } } as never, { session });
        if (receipt.modifiedCount !== 1) throw uncertain();
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority', j: true } });
    } catch (error) {
      if (error instanceof AppError && error.code === 'TRANSLATION_DAILY_LIMIT') throw error;
      throw new AppError(503, 'TRANSLATION_QUOTA_UNAVAILABLE', 'Không xác nhận được hạn mức dịch. Chưa gọi Gemini; không tự thử lại.');
    } finally { await session.endSession(); }
  },
  finish: async (s: AttemptScope, binding: string, draftJson: string) => {
    const result = await TranslationAttempt.updateOne({ _id: key(s), binding, state: 'CLAIMED' }, { $set: { state: 'DRAFT', draftJson } }, { writeConcern: { w: 'majority', j: true } });
    if (result.modifiedCount !== 1) throw uncertain();
  },
  record: async (s: AttemptScope, binding: string, phase: ExecutionPhase, previous: ExecutionPhase) => {
    const result = await TranslationAttempt.updateOne({ _id: key(s), binding, state: 'CLAIMED', executionVersion: 1, phase: previous }, { $set: { phase } }, { writeConcern: { w: 'majority', j: true } });
    if (result.modifiedCount !== 1) throw uncertain();
  },
  fail: async (s: AttemptScope, binding: string, state: string, phase: ExecutionPhase, diagnosticCode: string, providerHttpStatus: number | null, providerDiagnostic?: ProviderDiagnostic, transportDiagnostic?: TransportDiagnostic) => {
    // Never overwrite an already persisted draft after a lost acknowledgement.
    const result = await TranslationAttempt.updateOne({ _id: key(s), binding, state: 'CLAIMED', executionVersion: 1 }, { $set: { state, phase, diagnosticCode, failedAt: new Date(), ...(providerHttpStatus ? { providerHttpStatus } : {}), ...(providerDiagnostic ? { providerDiagnostic } : {}), ...(transportDiagnostic ? { transportDiagnostic } : {}) } }, { writeConcern: { w: 'majority', j: true } });
    return result.matchedCount === 1;
  },
};
export class CustomerAttemptStore {
  constructor(private readonly repo = repository) {}
  async inspect(s: AttemptScope): Promise<CustomerAttemptStatus | null> {
    const row = await this.repo.read(s);
    if (!row) return null;
    this.assertScope(s, row);
    return statusOf(row);
  }
  private assertScope(s: AttemptScope, row: AttemptScope) {
    if (row.ownerId !== s.ownerId || row.projectId !== s.projectId || row.sourceRevision !== s.sourceRevision || row.targetLanguage !== s.targetLanguage) throw uncertain();
  }
  async read(s: AttemptScope, binding?: string): Promise<GroupDraft | null> {
    const row = await this.repo.read(s);
    if (!row) return null;
    if (row.ownerId !== s.ownerId || row.projectId !== s.projectId || row.sourceRevision !== s.sourceRevision || row.targetLanguage !== s.targetLanguage || (binding && row.binding !== binding)) throw new AppError(409, 'TRANSLATION_ATTEMPT_MISMATCH', 'Nguồn, kế hoạch hoặc cấu hình của yêu cầu không khớp.');
    if (row.state !== 'DRAFT') {
      const status = statusOf(row).status;
      if (status === 'FAILED_PRE_DISPATCH') throw new AppError(409, 'TRANSLATION_FAILED_PRE_DISPATCH', 'Yêu cầu thất bại trước khi gửi Gemini. Không có bản dịch nháp; cần xử lý lỗi máy chủ, không tự gửi lại.');
      if (status === 'FAILED_RESPONSE') throw new AppError(409, 'TRANSLATION_FAILED_RESPONSE', 'Gemini đã phản hồi nhưng bản dịch chưa được lưu hợp lệ. Không gọi lại AI.');
      if (status === 'PROCESSING' || status === 'NOT_SENT') throw new AppError(409, 'TRANSLATION_ATTEMPT_IN_PROGRESS', 'Yêu cầu dịch đang được xử lý. Chỉ tải lại dữ liệu, không gửi lại AI.');
      throw uncertain();
    }
    if (typeof row.draftJson !== 'string' || Buffer.byteLength(row.draftJson) > 131072) throw uncertain();
    let draft: GroupDraft;
    try { draft = JSON.parse(row.draftJson) as GroupDraft; } catch { throw uncertain(); }
    if (draft.ownerId !== s.ownerId || draft.projectId !== s.projectId || draft.sourceRevision !== s.sourceRevision || draft.targetLanguage !== s.targetLanguage || draft.state !== 'DRAFT') throw uncertain();
    if (Date.parse(draft.expiresAt) <= Date.now() || !Number.isFinite(Date.parse(draft.expiresAt))) throw expired();
    return draft;
  }
  async execute(s: AttemptScope, binding: string, work: () => Promise<GroupDraft>) {
    const existing = await this.read(s, binding);
    if (existing) return existing;
    // Validate and snapshot configuration before any new durable claim. A policy
    // change never rearms an old attempt or changes its immutable source binding.
    const quotaPolicy = customerTranslationQuota();
    try { await this.repo.claim(s, binding); }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        const result = await this.read(s, binding); if (result) return result;
      }
      // Unknown write acknowledgement may already have committed. NEVER dispatch.
      throw uncertain();
    }
    const trace: ExecutionTrace = { phase: 'PREPARING', metadata: false, generation: false, response: false,
      record: async phase => { await this.repo.record(s, binding, phase, trace.phase); }, reserve: () => this.repo.quota(s, quotaPolicy) };
    try {
      const draft = await withCustomerExecution(trace, work);
      if (draft.ownerId !== s.ownerId || draft.projectId !== s.projectId || draft.targetLanguage !== s.targetLanguage || draft.sourceRevision !== s.sourceRevision || draft.state !== 'DRAFT') throw uncertain();
      const json = JSON.stringify(draft);
      if (Buffer.byteLength(json) > 131072) throw new AppError(413, 'TRANSLATION_DRAFT_TOO_LARGE', 'Bản nháp vượt giới hạn.');
      await trace.record('SAVING'); trace.phase = 'SAVING';
      try { await this.repo.finish(s, binding, json); }
      catch {
        // Recover a lost save acknowledgement by reading, not regenerating.
        const saved = await this.read(s, binding).catch(() => null);
        if (saved) return saved;
        // Idempotent CAS of the SAME validated bytes, at most once more.
        await this.repo.finish(s, binding, json);
      }
      return draft;
    } catch (error) {
      const code = safeCode(error);
      const providerHttpStatus = error instanceof TranslationProviderFailure ? error.providerHttpStatus : null;
      const providerDiagnostic = error instanceof TranslationProviderFailure ? error.providerDiagnostic : undefined;
      const transportDiagnostic = error instanceof TranslationProviderFailure ? error.transportDiagnostic : undefined;
      const state = trace.response ? 'FAILED_RESPONSE' : trace.metadata || trace.generation ? 'UNCERTAIN' : 'FAILED_PRE_DISPATCH';
      let diagnosticSaved = false;
      try { diagnosticSaved = await this.repo.fail(s, binding, state, trace.phase, code, providerHttpStatus, providerDiagnostic, transportDiagnostic); } catch { /* DB outage: keep the durable dispatch fence, never retry provider. */ }
      // Strict allowlist only: no Error object, stack, message, input or headers.
      console.error('CUSTOMER_TRANSLATION_FAILURE', { attemptId: key(s), state, phase: trace.phase, code, providerHttpStatus, providerReason: providerFailureReason(providerHttpStatus), providerDiagnostic, transportDiagnostic, diagnosticSaved });
      if (error instanceof AppError) throw error;
      throw new AppError(502, state === 'FAILED_PRE_DISPATCH' ? 'TRANSLATION_FAILED_PRE_DISPATCH' : 'TRANSLATION_ATTEMPT_UNCERTAIN', 'Không thể hoàn tất yêu cầu dịch. Chỉ tải lại dữ liệu, không gửi lại AI.');
    }
  }
}
export const customerAttempts = new CustomerAttemptStore();
