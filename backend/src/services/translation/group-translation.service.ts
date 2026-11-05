import { randomUUID } from 'node:crypto';
import mongoose, { type ClientSession } from 'mongoose';

import { Project } from '../../models/Project.js';
import { Transcript } from '../../models/Transcript.js';
import { TranscriptSegment } from '../../models/TranscriptSegment.js';
import { Translation, type TranslationDocument } from '../../models/Translation.js';
import { Language } from '../../models/Language.js';
import { AppError } from '../../utils/app-error.js';
import { GROUPING_VERSION, assertStoredGroups, candidateGroups, digest, outputDigest, revision, validatePlan, type SourceSnapshot, type TranslationGroup } from './group-plan.js';
import { type GroupDraftStore, groupDraftStore } from './group-draft-store.js';
import { GeminiGroupTranslationProvider, mapGroupResponse, type GroupProvider } from './gemini-group-translation.provider.js';
import { GeminiTranslationError } from './gemini-translation.provider.js';
import { isRevision, revisionFenceOperation, translationProvenance } from '../artifact-provenance.service.js';
import { boundedTextProjection, collectBoundedSource, sourceTooLarge, SOURCE_SEGMENT_LIMIT, SOURCE_BYTE_LIMIT } from './bounded-source.js';
import type { GroupAdmission } from './group-admission.js';
import { scopedGroupAdmission } from './group-source-scope.js';
import { assertControlledRequest, assertControlledSource, controlledScopeActive, controlledReadinessActive } from './controlled-development.js';
import { customerScopeActive, withCustomerTranslation, withCustomerModel, withCustomerMethod } from './customer-scope.js';
import { customerTranslationMethod } from '../../config/customer-translation-method.js';
import { assertSimpleInput, translationProviderInput } from './gemini-simple-contract.js';
import { customerTranslationModel } from '../../config/translation-model.js';
import { customerAttempts } from './customer-attempt.js';
import { recoverCustomerRead } from './customer-execution.js';
import { TranslationProviderFailure, providerFailureMessage } from './provider-failure.js';
import { ProcessingJob } from '../../models/ProcessingJob.js';
import { assertSourceLanguageConfirmed } from '../source-language-contract.js';
import { assertCustomerLanguages, assertCustomerTarget } from './customer-languages.js';

function enabled() { if (process.env.GROUP_TRANSLATION_ENABLED !== 'true' && !controlledScopeActive() && !customerScopeActive()) throw new AppError(503, 'GROUP_TRANSLATION_DISABLED', 'Dịch theo cụm chưa được bật trên máy chủ.'); }
const mismatch = () => new AppError(409, 'SOURCE_REVISION_MISMATCH', 'Bản ghi nguồn đã thay đổi. Vui lòng tải lại kế hoạch; bản nháp không được lưu.');
const exists = () => new AppError(409, 'TRANSLATION_ALREADY_EXISTS', 'Ngôn ngữ này đã có bản dịch. Không ghi đè bản dịch hiện có.');
export async function loadSource(projectId: string, session: ClientSession | null = null, admission?: GroupAdmission): Promise<SourceSnapshot> {
  admission ??= scopedGroupAdmission();
  if (process.env.NODE_ENV === 'development' && admission) assertControlledRequest(projectId);
  const byteLimit = admission?.policy.sourceBytes ?? SOURCE_BYTE_LIMIT;
  const [transcript] = await Transcript.aggregate([
    { $match: { projectId: new mongoose.Types.ObjectId(projectId) } }, { $limit: 1 },
    { $project: { _id: 1, revision: { $cond: [{ $isNumber: '$revision' }, '$revision', null] }, status: boundedTextProjection('status', 20), sourceLanguageStatus: boundedTextProjection('sourceLanguageStatus', 24), languageCode: boundedTextProjection('languageCode', 20), fullText: boundedTextProjection('fullText', byteLimit) } },
  ]).session(session);
  if (!transcript || !['READY', 'SAVED'].includes(transcript.status)) throw new AppError(409, 'TRANSCRIPT_NOT_FOUND', 'Chưa có bản ghi hợp lệ để dịch.');
  if (!isRevision(transcript.revision)) throw new AppError(409, 'TRANSCRIPT_REVISION_UNAVAILABLE', 'Transcript revision is unavailable for safe artifact creation.');
  assertSourceLanguageConfirmed({ sourceLanguage: transcript.languageCode, sourceLanguageStatus: transcript.sourceLanguageStatus });
  if (typeof transcript.fullText !== 'string' || typeof transcript.languageCode !== 'string') throw sourceTooLarge();
  const cursor = TranscriptSegment.aggregate([
    { $match: { transcriptId: transcript._id } }, { $sort: { sequence: 1 } }, { $limit: SOURCE_SEGMENT_LIMIT + 1 },
    { $project: { _id: 1,
      sequence: { $cond: [{ $isNumber: '$sequence' }, '$sequence', null] },
      startTime: { $cond: [{ $isNumber: '$startTime' }, '$startTime', null] },
      endTime: { $cond: [{ $isNumber: '$endTime' }, '$endTime', null] }, text: boundedTextProjection('text', byteLimit) } },
  ]).session(session).cursor({ batchSize: 1 });
  try {
    const rows = (async function* () { for await (const s of cursor) yield { id: String(s._id), sequence: s.sequence, text: s.text, startTime: s.startTime, endTime: s.endTime }; })();
    const source = await collectBoundedSource({ transcriptId: String(transcript._id), transcriptRevision: transcript.revision, languageCode: transcript.languageCode, fullText: transcript.fullText }, rows, byteLimit);
    const current = await Transcript.findOne({ _id: transcript._id, projectId }).select('_id revision').session(session);
    if (!current || current.revision !== transcript.revision) throw mismatch();
    if (process.env.NODE_ENV === 'development' && admission) assertControlledSource(projectId, source);
    return source;
  } finally { await cursor.close(); }
}
type GroupedRecord = Pick<TranslationDocument, 'alignmentFormat' | 'sourceRevision' | 'sourceTranscriptRevision' | 'groupingVersion' | 'groups' | 'review' | 'fullText' | 'targetLanguage' | 'transcriptId' | 'sourceLanguage'>;
export async function boundedTranslationRecord(filter: Record<string, unknown>, session: ClientSession | null = null, admission = scopedGroupAdmission()) {
  if (!admission) return session ? Translation.findOne(filter).session(session) : Translation.findOne(filter);
  const match = { ...filter };
  for (const key of ['_id', 'projectId', 'transcriptId']) if (typeof match[key] === 'string') match[key] = new mongoose.Types.ObjectId(match[key] as string);
  const [row] = await Translation.aggregate([{ $match: match }, { $limit: 1 }, { $project: { record: { $cond: [{ $lte: [{ $bsonSize: '$$ROOT' }, 4 * 1024 * 1024] }, '$$ROOT', null] } } }]).session(session);
  if (!row) return null;
  if (!row.record) throw new AppError(413, 'TRANSLATION_RESPONSE_TOO_LARGE', 'Bản dịch vượt giới hạn thử nghiệm.');
  return Translation.hydrate(row.record);
}
export function storedGroups(record: GroupedRecord): TranslationGroup[] {
  return (record.groups ?? []).map(g => ({ groupId: g.groupId, sequence: g.sequence, sourceSegmentIds: g.sourceSegmentIds.map(String), sourceText: g.sourceText, translatedText: g.translatedText, startTime: g.startTime, endTime: g.endTime }));
}
export function assertApprovedCurrent(record: GroupedRecord, source: SourceSnapshot): void {
  if (record.alignmentFormat !== 'GROUPS_V1') return;
  if (translationProvenance(record, { id: source.transcriptId, revision: source.transcriptRevision }) !== 'CURRENT') throw mismatch();
  if (!record.review || record.review.method !== 'MANUAL_V1' || !record.review.reviewedBy || !record.review.reviewedAt || record.review.sourceRevision !== record.sourceRevision) throw new AppError(409, 'TRANSLATION_REVIEW_REQUIRED', 'Bản dịch phải được duyệt trước khi sử dụng.');
  if (record.groupingVersion !== GROUPING_VERSION || record.sourceRevision !== revision(source) || String(record.transcriptId) !== source.transcriptId || record.sourceLanguage !== source.languageCode) throw mismatch();
  const groups = storedGroups(record); assertStoredGroups(source, groups);
  if (record.review.outputDigest !== outputDigest(record.sourceRevision, record.targetLanguage, groups) || record.fullText !== groups.map(g => g.translatedText).join(' ')) throw new AppError(409, 'TRANSLATION_DRAFT_CHANGED', 'Nội dung bản dịch không khớp thông tin duyệt.');
}
export async function groupedDto(record: TranslationDocument & { _id: unknown }, admission?: GroupAdmission) {
  assertApprovedCurrent(record, await loadSource(String(record.projectId), null, admission));
  const groups = storedGroups(record);
  return { id: String(record._id), projectId: String(record.projectId), sourceLanguage: record.sourceLanguage, targetLanguage: record.targetLanguage,
    alignmentFormat: 'GROUPS_V1' as const, state: 'APPROVED' as const, provenanceState: 'CURRENT' as const,
    sourceRevision: record.sourceRevision, transcriptRevision: record.sourceTranscriptRevision, groupingVersion: record.groupingVersion,
    fullText: record.fullText, groups: groups.map(g => ({ ...g, targetLanguageCode: record.targetLanguage })), sourceSegmentCount: groups.reduce((n, g) => n + g.sourceSegmentIds.length, 0), groupCount: groups.length,
    review: { method: record.review!.method, reviewedAt: record.review!.reviewedAt, outputDigest: record.review!.outputDigest }, createdAt: record.createdAt, updatedAt: record.updatedAt };
}
export class GroupTranslationService {
  constructor(private readonly provider: GroupProvider = new GeminiGroupTranslationProvider(), private readonly store: GroupDraftStore = groupDraftStore, private readonly admission?: GroupAdmission) {}
  private async authorizedProject(projectId: string, ownerId: string, targetLanguage: string, session: ClientSession | null = null) {
    if (process.env.NODE_ENV === 'development' && this.admission) assertControlledRequest(projectId, ownerId, targetLanguage);
    const project = await Project.findOne({ _id: projectId, userId: ownerId }).select('_id status sourceLanguage sourceLanguageMode sourceLanguageStatus').session(session);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
    assertSourceLanguageConfirmed(project);
    if (customerScopeActive() && !controlledScopeActive()) assertCustomerLanguages(project.sourceLanguage, targetLanguage, customerTranslationMethod());
    if (!['TRANSCRIBED', 'TRANSLATED', 'FAILED'].includes(project.status)) throw new AppError(409, 'INVALID_PROJECT_STATE', 'Trạng thái dự án không cho phép dịch theo cụm.');
    if (project.sourceLanguage === targetLanguage) throw new AppError(400, 'SAME_SOURCE_TARGET_LANGUAGE', 'Ngôn ngữ đích phải khác ngôn ngữ nguồn.');
    if (!await Language.exists({ code: targetLanguage, isActive: true }).session(session)) throw new AppError(400, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED', 'Ngôn ngữ đích chưa được hỗ trợ.');
    return project;
  }
  private async context(projectId: string, ownerId: string, targetLanguage: string, session: ClientSession | null = null) {
    const read = async () => {
      const project = await this.authorizedProject(projectId, ownerId, targetLanguage, session);
      const source = await loadSource(projectId, session, this.admission);
      if (source.languageCode !== project.sourceLanguage || source.languageCode === targetLanguage) throw mismatch();
      return source;
    };
    return customerScopeActive() && !session ? recoverCustomerRead(read) : read();
  }
  async plan(projectId: string, ownerId: string, targetLanguage: string) {
    enabled(); const lease = this.admission?.operationLease(ownerId);
    try {
      const source = await this.context(projectId, ownerId, targetLanguage);
      if (await Translation.exists({ transcriptId: source.transcriptId, targetLanguage })) throw exists();
      if (!isRevision(source.transcriptRevision)) throw new AppError(409, 'TRANSCRIPT_REVISION_UNAVAILABLE', 'Transcript revision is unavailable for safe artifact creation.');
      const transcriptRevision = source.transcriptRevision;
      return { projectId, targetLanguage, sourceLanguage: source.languageCode, transcriptRevision, sourceRevision: revision(source), groupingVersion: GROUPING_VERSION, groups: candidateGroups(source), sourceSegmentCount: source.segments.length };
    } finally { lease?.release(); }
  }
  async preview(projectId: string, ownerId: string, body: { targetLanguage: string; sourceRevision: string; groupingVersion: string; groups: string[][]; idempotencyKey: string }) {
    if (customerScopeActive() && !controlledScopeActive()) {
      const source = await this.context(projectId, ownerId, body.targetLanguage);
      assertCustomerLanguages(source.languageCode, body.targetLanguage, customerTranslationMethod());
      if (revision(source) !== body.sourceRevision || body.groupingVersion !== GROUPING_VERSION) throw mismatch();
      const groups = validatePlan(source, body.groups);
      if (groups.length > 1000 || await Translation.exists({ projectId, targetLanguage: body.targetLanguage }) || await ProcessingJob.exists({ projectId, status: { $in: ['QUEUED', 'PROCESSING'] } })) throw new AppError(409, 'TRANSLATION_CONFLICT', 'Dự án có dữ liệu hoặc tác vụ xung đột.');
      const input = translationProviderInput(source, body.targetLanguage, groups);
      const model = customerTranslationModel().model;
      const method = customerTranslationMethod();
      if (method === 'GEMINI_SIMPLE_V1') {
        assertSimpleInput(input);
        if ((process.env.CUSTOMER_TRANSLATION_THINKING ?? 'DEFAULT') !== 'DEFAULT') throw new AppError(503, 'TRANSLATION_NOT_CONFIGURED', 'Dịch đơn giản yêu cầu thinking DEFAULT.');
      }
      const bindingParts = [source.transcriptRevision, revision(source), digest(input), digest(input.groups.map(g => g.groupId)), model, process.env.CUSTOMER_TRANSLATION_THINKING ?? 'DEFAULT', 8192, 120000, 0];
      // Preserve historical GROUPS_V1 binding bytes. Same attempt key blocks method switching.
      const binding = digest(method === 'GROUPS_V1' ? bindingParts : [...bindingParts, 'gemini', method]);
      const draft = await customerAttempts.execute({ ownerId, projectId, targetLanguage: body.targetLanguage, sourceRevision: revision(source) }, binding,
        () => withCustomerModel(model, () => withCustomerMethod(method, () => this.previewInternal(projectId, ownerId, { ...body, idempotencyKey: 'server-derived' }))));
      const after = await this.context(projectId, ownerId, body.targetLanguage);
      if (revision(after) !== revision(source)) throw mismatch();
      assertStoredGroups(source, draft.groups);
      if (draft.targetLanguage !== body.targetLanguage || draft.outputDigest !== outputDigest(revision(source), body.targetLanguage, draft.groups) || draft.transcriptRevision !== source.transcriptRevision || draft.transcriptId !== source.transcriptId || draft.sourceLanguage !== source.languageCode || draft.groupingVersion !== GROUPING_VERSION) throw mismatch();
      return this.store.restore(draft);
    }
    const work = () => this.previewInternal(projectId, ownerId, body);
    return this.admission ? this.admission.operation(ownerId, work) : work();
  }
  async customerGenerate(projectId: string, ownerId: string, targetLanguage = 'en') {
    if (process.env.CUSTOMER_TRANSLATION_ENABLED !== 'true' || process.env.CONTROLLED_PROVIDER_MODE) throw new AppError(503, 'CUSTOMER_TRANSLATION_DISABLED', 'Dịch Customer chưa được bật.');
    assertCustomerTarget(targetLanguage);
    if (customerActive.size >= 2 || customerActive.has(ownerId)) throw new AppError(429, 'TRANSLATION_CAPACITY_EXHAUSTED', 'Đang có yêu cầu dịch. Chỉ tải lại dữ liệu, không tự thử lại.');
    customerActive.add(ownerId);
    try { return await withCustomerTranslation(async () => {
      const plan = await this.plan(projectId, ownerId, targetLanguage);
      return this.preview(projectId, ownerId, { targetLanguage, sourceRevision: plan.sourceRevision, groupingVersion: plan.groupingVersion,
        groups: plan.groups.map(g => g.sourceSegmentIds), idempotencyKey: 'server-derived' });
    }); } finally { customerActive.delete(ownerId); }
  }
  private async customerReadSource(projectId: string, ownerId: string, targetLanguage: string) {
    assertCustomerTarget(targetLanguage);
    const project = await Project.findOne({ _id: projectId, userId: ownerId }).select('_id sourceLanguage sourceLanguageMode sourceLanguageStatus');
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
    assertSourceLanguageConfirmed(project);
    assertCustomerLanguages(project.sourceLanguage, targetLanguage, customerTranslationMethod());
    const source = await loadSource(projectId);
    if (source.languageCode !== project.sourceLanguage) throw mismatch();
    return source;
  }
  async customerDraft(projectId: string, ownerId: string, targetLanguage = 'en') {
    if (process.env.CUSTOMER_TRANSLATION_ENABLED !== 'true' || process.env.CONTROLLED_PROVIDER_MODE) throw new AppError(503, 'CUSTOMER_TRANSLATION_DISABLED', 'Dịch Customer chưa được bật.');
    return withCustomerTranslation(async () => {
      // Viewing/recovering a draft/approval receipt must not regress workflow or
      // require mutation permission after the project has advanced.
      const source = await this.customerReadSource(projectId, ownerId, targetLanguage);
      const draft = await customerAttempts.read({ ownerId, projectId, targetLanguage, sourceRevision: revision(source) });
      if (!draft) return null;
      assertStoredGroups(source, draft.groups);
      if (draft.targetLanguage !== targetLanguage || draft.transcriptRevision !== source.transcriptRevision || draft.transcriptId !== source.transcriptId || draft.sourceLanguage !== source.languageCode || draft.groupingVersion !== GROUPING_VERSION || draft.outputDigest !== outputDigest(revision(source), targetLanguage, draft.groups)) throw mismatch();
      return this.store.restore(draft);
    });
  }
  async customerState(projectId: string, ownerId: string, targetLanguage = 'en') {
    if (process.env.CUSTOMER_TRANSLATION_ENABLED !== 'true' || process.env.CONTROLLED_PROVIDER_MODE) throw new AppError(503, 'CUSTOMER_TRANSLATION_DISABLED', 'Dịch Customer chưa được bật.');
    return withCustomerTranslation(async () => {
      const source = await this.customerReadSource(projectId, ownerId, targetLanguage);
      const attempt = await customerAttempts.inspect({ ownerId, projectId, targetLanguage, sourceRevision: revision(source) });
      return { targetLanguage, draft: attempt?.status === 'DRAFT_SAVED' ? await this.customerDraft(projectId, ownerId, targetLanguage) : null, attempt };
    });
  }
  private async previewInternal(projectId: string, ownerId: string, body: { targetLanguage: string; sourceRevision: string; groupingVersion: string; groups: string[][]; idempotencyKey: string }) {
    if (controlledReadinessActive()) throw new AppError(503, 'CONTROLLED_PROVIDER_DENIED', 'Readiness does not authorize generation.');
    enabled();
    // Recheck identity/ownership even for cached single-flight results. No source
    // text is materialized here; the expensive load happens inside admission.
    await this.authorizedProject(projectId, ownerId, body.targetLanguage);
    const key = digest([ownerId, projectId, body.targetLanguage, body.sourceRevision]);
    const draft = await this.store.preview(key, digest(body), async () => {
      const source = await this.context(projectId, ownerId, body.targetLanguage);
      if (!isRevision(source.transcriptRevision)) throw new AppError(409, 'TRANSCRIPT_REVISION_UNAVAILABLE', 'Transcript revision is unavailable for safe artifact creation.');
      const transcriptRevision = source.transcriptRevision;
      if (revision(source) !== body.sourceRevision || body.groupingVersion !== GROUPING_VERSION) throw mismatch();
      const groups = validatePlan(source, body.groups);
      if (groups.length > 1000 || Buffer.byteLength(JSON.stringify(source)) > (this.admission?.policy.sourceBytes ?? SOURCE_BYTE_LIMIT)) throw new AppError(413, 'TRANSLATION_DRAFT_TOO_LARGE', 'Bản ghi vượt giới hạn dịch theo cụm.');
      if (await Translation.exists({ transcriptId: source.transcriptId, targetLanguage: body.targetLanguage })) throw exists();
      // One active/result request per owner/project/target/revision. New keys cannot bypass retry safety during TTL.
      const input = translationProviderInput(source, body.targetLanguage, groups);
      try {
        const output = await this.provider.translate(input, customerScopeActive() ? async () => {
          const current = await this.context(projectId, ownerId, body.targetLanguage);
          if (revision(current) !== body.sourceRevision || current.transcriptRevision !== transcriptRevision || await ProcessingJob.exists({ projectId, status: { $in: ['QUEUED', 'PROCESSING'] } })) throw mismatch();
        } : undefined);
        const validated = mapGroupResponse(JSON.stringify({ outcome: 'translated', groups: output }), input);
        const translated = groups.map((g, i) => ({ ...g, translatedText: validated[i]!.translatedText }));
        return { ownerId, projectId, transcriptId: source.transcriptId, transcriptRevision, sourceLanguage: source.languageCode, targetLanguage: body.targetLanguage,
          sourceRevision: body.sourceRevision, groupingVersion: GROUPING_VERSION, groups: translated, outputDigest: outputDigest(body.sourceRevision, body.targetLanguage, translated) };
      } catch (error) {
        if (error instanceof AppError) throw error;
        const code = error instanceof GeminiTranslationError ? error.code : 'TRANSLATION_PROVIDER_ERROR';
        const messages: Record<string, string> = { TRANSLATION_NOT_CONFIGURED: 'Dịch vụ dịch chưa được cấu hình.', TRANSLATION_INVALID_KEY: 'Khóa dịch vụ dịch không hợp lệ.', TRANSLATION_MODEL_UNAVAILABLE: 'Model dịch không khả dụng.', TRANSLATION_QUOTA_EXCEEDED: 'Dịch vụ dịch đã hết hạn mức.', TRANSLATION_TIMEOUT: 'Dịch vụ dịch phản hồi quá lâu.', TRANSLATION_NETWORK_ERROR: 'Không kết nối được dịch vụ dịch.', TRANSLATION_MAPPING_FAILED: 'Không thể ánh xạ các cụm dịch.', TRANSLATION_INVALID_RESPONSE: 'Dịch vụ dịch trả về dữ liệu không hợp lệ.' };
        const httpStatus = error instanceof GeminiTranslationError ? error.httpStatus : undefined;
        const diagnostic = error instanceof GeminiTranslationError ? error.diagnostic : undefined;
        throw new TranslationProviderFailure(code === 'TRANSLATION_NOT_CONFIGURED' ? 503 : 502, code, providerFailureMessage(httpStatus, diagnostic) ?? (messages[code] ?? 'Không thể xem trước bản dịch.') + ' Không tự động gọi lại AI.', httpStatus, diagnostic, error instanceof GeminiTranslationError ? error.transportDiagnostic : undefined);
      }
    }, this.admission ? { ownerId, controller: this.admission } : undefined);
    const current = await Transcript.findOne({ _id: draft.transcriptId, projectId }).select('_id revision');
    if (!current || current.revision !== draft.transcriptRevision) throw mismatch();
    return draft;
  }
  draft(projectId: string, ownerId: string, draftId: string) { enabled(); return this.store.get(draftId, ownerId, projectId); }
  async readDraft(projectId: string, ownerId: string, draftId: string) {
    const work = async () => {
      if (!await Project.exists({ _id: projectId, userId: ownerId })) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
      return this.draft(projectId, ownerId, draftId);
    };
    return this.admission ? this.admission.operation(ownerId, work) : work();
  }
  async approved(projectId: string, ownerId: string, targetLanguage: string) {
    enabled();
    const work = async () => {
      // Viewing a valid artifact does not require a resumable project status.
      if (!await Project.exists({ _id: projectId, userId: ownerId })) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
      const record = await this.boundedRecord({ projectId: new mongoose.Types.ObjectId(projectId), targetLanguage, status: 'READY' });
      if (!record) throw new AppError(404, 'TRANSLATION_NOT_FOUND', 'Không tìm thấy bản dịch.');
      if (record.alignmentFormat !== 'GROUPS_V1') throw new AppError(409, 'TRANSLATION_FORMAT_UNSUPPORTED', 'Bản dịch không ở định dạng GROUPS_V1.');
      return groupedDto(record, this.admission);
    };
    return this.admission ? this.admission.operation(ownerId, work) : work();
  }
  private async boundedRecord(filter: Record<string, unknown>, session: ClientSession | null = null) {
    return boundedTranslationRecord(filter, session, this.admission);
  }
  async approve(projectId: string, ownerId: string, draftId: string, body: { outputDigest: string; reviewed: true }) {
    const work = () => this.approveInternal(projectId, ownerId, draftId, body);
    return this.admission ? this.admission.operation(ownerId, work) : work();
  }
  private async approveInternal(projectId: string, ownerId: string, draftId: string, body: { outputDigest: string; reviewed: true }) {
    if (controlledReadinessActive()) throw new AppError(503, 'CONTROLLED_APPROVAL_DENIED', 'Readiness does not authorize database writes.');
    enabled(); const draft = this.store.get(draftId, ownerId, projectId);
    if (body.reviewed !== true) throw new AppError(409, 'TRANSLATION_REVIEW_REQUIRED', 'Vui lòng xác nhận đã kiểm tra ngữ nghĩa.');
    if (body.outputDigest !== draft.outputDigest) throw new AppError(409, 'TRANSLATION_DRAFT_CHANGED', 'Bản nháp không khớp nội dung đã duyệt.');
    return this.store.approve(draftId, async () => {
      // Lost-response receipt: return the same approved record even if the workflow
      // has since advanced to TTS/result. Never regress Project state on a retry.
      const receipt = await this.boundedRecord({ transcriptId: new mongoose.Types.ObjectId(draft.transcriptId), projectId: new mongoose.Types.ObjectId(projectId), targetLanguage: draft.targetLanguage });
      if (receipt) {
        const owner = await Project.findOne({ _id: projectId, userId: ownerId });
        if (!owner) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
        if (owner.sourceLanguage !== draft.sourceLanguage) throw mismatch();
        if (!await Language.exists({ code: draft.targetLanguage, isActive: true })) throw new AppError(400, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED', 'Ngôn ngữ đích chưa được hỗ trợ.');
        if (receipt.alignmentFormat !== 'GROUPS_V1' || String(receipt.review?.reviewedBy) !== ownerId || receipt.review?.outputDigest !== draft.outputDigest) throw exists();
        return { translation: await groupedDto(receipt, this.admission) };
      }
      const session = await mongoose.startSession(); let saved: (TranslationDocument & { _id: unknown }) | undefined;
      try {
        await session.withTransaction(async () => {
          this.store.get(draftId, ownerId, projectId);
          // Claim project in the transaction: source-processing writers also update this document.
          // Concurrent changes cause write conflict/revalidation, not a stale approved translation.
          const claimed = await Project.findOneAndUpdate({ _id: projectId, userId: ownerId, status: { $in: ['TRANSCRIBED', 'TRANSLATED', 'FAILED'] } }, { $set: { status: 'TRANSLATED' } }, { session, returnDocument: 'after' });
          if (!claimed) throw new AppError(409, 'INVALID_PROJECT_STATE', 'Dự án đang xử lý hoặc không còn khả dụng.');
          const source = await this.context(projectId, ownerId, draft.targetLanguage, session);
          if (revision(source) !== draft.sourceRevision || source.transcriptId !== draft.transcriptId || source.transcriptRevision !== draft.transcriptRevision) throw mismatch();
          assertStoredGroups(source, draft.groups);
          const transcriptFence = revisionFenceOperation(source.transcriptId, source.transcriptRevision);
          const fencedTranscript = await Transcript.updateOne(transcriptFence.filter, transcriptFence.update, { session });
          if (fencedTranscript.matchedCount !== 1) throw mismatch();
          const current = await this.boundedRecord({ transcriptId: new mongoose.Types.ObjectId(source.transcriptId), targetLanguage: draft.targetLanguage }, session);
          if (current) {
            if (current.alignmentFormat !== 'GROUPS_V1' || String(current.review?.reviewedBy) !== ownerId || current.review?.outputDigest !== draft.outputDigest) throw exists();
            assertApprovedCurrent(current, source); saved = current; return;
          }
          this.store.get(draftId, ownerId, projectId);
          const [record] = await Translation.create([{ projectId, transcriptId: source.transcriptId, sourceLanguage: source.languageCode, targetLanguage: draft.targetLanguage,
            fullText: draft.groups.map(g => g.translatedText).join(' '), status: 'READY', alignmentFormat: 'GROUPS_V1', revision: 1,
            sourceTranscriptRevision: draft.transcriptRevision, sourceRevision: draft.sourceRevision, groupingVersion: GROUPING_VERSION,
            groups: draft.groups, review: { reviewedBy: ownerId, reviewedAt: new Date(), sourceRevision: draft.sourceRevision, outputDigest: draft.outputDigest, method: 'MANUAL_V1' } }], { session });
          if (!record) throw new AppError(500, 'TRANSLATION_SAVE_FAILED', 'Không thể lưu bản dịch.'); saved = record;
        });
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw exists();
        throw error;
      } finally { await session.endSession(); }
      if (!saved) throw new AppError(500, 'TRANSLATION_SAVE_FAILED', 'Không thể lưu bản dịch.');
      return { translation: await groupedDto(saved, this.admission) };
    });
  }
  async translateDirect(projectId: string, ownerId: string, targetLanguage: string) {
    enabled();
    const source = await this.context(projectId, ownerId, targetLanguage);
    const existing = await this.boundedRecord({ transcriptId: new mongoose.Types.ObjectId(source.transcriptId), projectId: new mongoose.Types.ObjectId(projectId), targetLanguage, status: 'READY' });
    if (existing && existing.alignmentFormat === 'GROUPS_V1') {
      try {
        assertApprovedCurrent(existing, source);
        return { project: { id: projectId, status: 'TRANSLATED' }, translation: await groupedDto(existing, this.admission), idempotent: true };
      } catch {
        // Stale or unverified existing record; proceed to re-plan
      }
    }
    const plan = await this.plan(projectId, ownerId, targetLanguage);
    const draft = await this.preview(projectId, ownerId, {
      targetLanguage,
      sourceRevision: plan.sourceRevision,
      groupingVersion: plan.groupingVersion,
      groups: plan.groups.map(g => g.sourceSegmentIds),
      idempotencyKey: randomUUID(),
    });
    const approved = await this.approve(projectId, ownerId, draft.draftId, {
      outputDigest: draft.outputDigest,
      reviewed: true,
    });
    return { project: { id: projectId, status: 'TRANSLATED' }, ...approved, idempotent: false };
  }
}

export const groupTranslationService = new GroupTranslationService();
const customerActive = new Set<string>(); // Per-process, held until underlying work settles, not client disconnect.
