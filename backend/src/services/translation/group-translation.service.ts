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

function enabled() { if (process.env.GROUP_TRANSLATION_ENABLED !== 'true') throw new AppError(503, 'GROUP_TRANSLATION_DISABLED', 'Dịch theo cụm chưa được bật trên máy chủ.'); }
const mismatch = () => new AppError(409, 'SOURCE_REVISION_MISMATCH', 'Bản ghi nguồn đã thay đổi. Vui lòng tải lại kế hoạch; bản nháp không được lưu.');
const exists = () => new AppError(409, 'TRANSLATION_ALREADY_EXISTS', 'Ngôn ngữ này đã có bản dịch. Không ghi đè bản dịch hiện có.');
export async function loadSource(projectId: string, session: ClientSession | null = null): Promise<SourceSnapshot> {
  const transcript = await Transcript.findOne({ projectId }).session(session);
  if (!transcript || !['READY', 'SAVED'].includes(transcript.status)) throw new AppError(409, 'TRANSCRIPT_NOT_FOUND', 'Chưa có bản ghi hợp lệ để dịch.');
  const segments = await TranscriptSegment.find({ transcriptId: transcript._id }).sort({ sequence: 1 }).session(session);
  return { transcriptId: String(transcript._id), languageCode: transcript.languageCode, fullText: transcript.fullText,
    segments: segments.map(s => ({ id: String(s._id), sequence: s.sequence, text: s.text, startTime: s.startTime, endTime: s.endTime })) };
}
type GroupedRecord = Pick<TranslationDocument, 'alignmentFormat' | 'sourceRevision' | 'groupingVersion' | 'groups' | 'review' | 'fullText' | 'targetLanguage' | 'transcriptId' | 'sourceLanguage'>;
export function storedGroups(record: GroupedRecord): TranslationGroup[] {
  return (record.groups ?? []).map(g => ({ groupId: g.groupId, sequence: g.sequence, sourceSegmentIds: g.sourceSegmentIds.map(String), sourceText: g.sourceText, translatedText: g.translatedText, startTime: g.startTime, endTime: g.endTime }));
}
export function assertApprovedCurrent(record: GroupedRecord, source: SourceSnapshot): void {
  if (record.alignmentFormat !== 'GROUPS_V1') return;
  if (!record.review || record.review.method !== 'MANUAL_V1' || !record.review.reviewedBy || !record.review.reviewedAt || record.review.sourceRevision !== record.sourceRevision) throw new AppError(409, 'TRANSLATION_REVIEW_REQUIRED', 'Bản dịch phải được duyệt trước khi sử dụng.');
  if (record.groupingVersion !== GROUPING_VERSION || record.sourceRevision !== revision(source) || String(record.transcriptId) !== source.transcriptId || record.sourceLanguage !== source.languageCode) throw mismatch();
  const groups = storedGroups(record); assertStoredGroups(source, groups);
  if (record.review.outputDigest !== outputDigest(record.sourceRevision, record.targetLanguage, groups) || record.fullText !== groups.map(g => g.translatedText).join(' ')) throw new AppError(409, 'TRANSLATION_DRAFT_CHANGED', 'Nội dung bản dịch không khớp thông tin duyệt.');
}
export async function groupedDto(record: TranslationDocument & { _id: unknown }) {
  assertApprovedCurrent(record, await loadSource(String(record.projectId)));
  const groups = storedGroups(record);
  return { id: String(record._id), projectId: String(record.projectId), sourceLanguage: record.sourceLanguage, targetLanguage: record.targetLanguage,
    alignmentFormat: 'GROUPS_V1' as const, state: 'APPROVED' as const, sourceRevision: record.sourceRevision, groupingVersion: record.groupingVersion,
    fullText: record.fullText, groups: groups.map(g => ({ ...g, targetLanguageCode: record.targetLanguage })), sourceSegmentCount: groups.reduce((n, g) => n + g.sourceSegmentIds.length, 0), groupCount: groups.length,
    review: { method: record.review!.method, reviewedAt: record.review!.reviewedAt, outputDigest: record.review!.outputDigest }, createdAt: record.createdAt, updatedAt: record.updatedAt };
}
export class GroupTranslationService {
  constructor(private readonly provider: GroupProvider = new GeminiGroupTranslationProvider(), private readonly store: GroupDraftStore = groupDraftStore) {}
  private async context(projectId: string, ownerId: string, targetLanguage: string, session: ClientSession | null = null) {
    const project = await Project.findOne({ _id: projectId, userId: ownerId }).session(session);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
    if (!['TRANSCRIBED', 'TRANSLATED', 'FAILED'].includes(project.status)) throw new AppError(409, 'INVALID_PROJECT_STATE', 'Trạng thái dự án không cho phép dịch theo cụm.');
    if (project.sourceLanguage === targetLanguage) throw new AppError(400, 'SAME_SOURCE_TARGET_LANGUAGE', 'Ngôn ngữ đích phải khác ngôn ngữ nguồn.');
    if (!await Language.exists({ code: targetLanguage, isActive: true }).session(session)) throw new AppError(400, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED', 'Ngôn ngữ đích chưa được hỗ trợ.');
    const source = await loadSource(projectId, session);
    if (source.languageCode !== project.sourceLanguage || source.languageCode === targetLanguage) throw mismatch();
    return source;
  }
  async plan(projectId: string, ownerId: string, targetLanguage: string) {
    enabled(); const source = await this.context(projectId, ownerId, targetLanguage);
    if (await Translation.exists({ transcriptId: source.transcriptId, targetLanguage })) throw exists();
    return { projectId, targetLanguage, sourceLanguage: source.languageCode, sourceRevision: revision(source), groupingVersion: GROUPING_VERSION, groups: candidateGroups(source), sourceSegmentCount: source.segments.length };
  }
  async preview(projectId: string, ownerId: string, body: { targetLanguage: string; sourceRevision: string; groupingVersion: string; groups: string[][]; idempotencyKey: string }) {
    enabled(); const source = await this.context(projectId, ownerId, body.targetLanguage);
    if (revision(source) !== body.sourceRevision || body.groupingVersion !== GROUPING_VERSION) throw mismatch();
    const groups = validatePlan(source, body.groups);
    if (groups.length > 1000 || Buffer.byteLength(JSON.stringify(source)) > 96 * 1024) throw new AppError(413, 'TRANSLATION_DRAFT_TOO_LARGE', 'Bản ghi vượt giới hạn dịch theo cụm.');
    if (await Translation.exists({ transcriptId: source.transcriptId, targetLanguage: body.targetLanguage })) throw exists();
    // One active/result request per owner/project/target/revision. New keys cannot bypass retry safety during TTL.
    const key = digest([ownerId, projectId, body.targetLanguage, body.sourceRevision]);
    return this.store.preview(key, digest(body), async () => {
      const input = { fullText: source.fullText, sourceLanguage: source.languageCode, targetLanguage: body.targetLanguage, groups: groups.map(g => ({ groupId: g.groupId, sourceText: g.sourceText })) };
      try {
        const output = await this.provider.translate(input);
        const validated = mapGroupResponse(JSON.stringify({ outcome: 'translated', groups: output }), input);
        const translated = groups.map((g, i) => ({ ...g, translatedText: validated[i]!.translatedText }));
        return { ownerId, projectId, transcriptId: source.transcriptId, sourceLanguage: source.languageCode, targetLanguage: body.targetLanguage,
          sourceRevision: body.sourceRevision, groupingVersion: GROUPING_VERSION, groups: translated, outputDigest: outputDigest(body.sourceRevision, body.targetLanguage, translated) };
      } catch (error) {
        if (error instanceof AppError) throw error;
        const code = error instanceof GeminiTranslationError ? error.code : 'TRANSLATION_PROVIDER_ERROR';
        const messages: Record<string, string> = { TRANSLATION_NOT_CONFIGURED: 'Dịch vụ dịch chưa được cấu hình.', TRANSLATION_INVALID_KEY: 'Khóa dịch vụ dịch không hợp lệ.', TRANSLATION_MODEL_UNAVAILABLE: 'Model dịch không khả dụng.', TRANSLATION_QUOTA_EXCEEDED: 'Dịch vụ dịch đã hết hạn mức.', TRANSLATION_TIMEOUT: 'Dịch vụ dịch phản hồi quá lâu.', TRANSLATION_NETWORK_ERROR: 'Không kết nối được dịch vụ dịch.', TRANSLATION_MAPPING_FAILED: 'Không thể ánh xạ các cụm dịch.', TRANSLATION_INVALID_RESPONSE: 'Dịch vụ dịch trả về dữ liệu không hợp lệ.' };
        throw new AppError(code === 'TRANSLATION_NOT_CONFIGURED' ? 503 : 502, code, (messages[code] ?? 'Không thể xem trước bản dịch.') + ' Không tự động gọi lại AI.');
      }
    });
  }
  draft(projectId: string, ownerId: string, draftId: string) { enabled(); return this.store.get(draftId, ownerId, projectId); }
  async approve(projectId: string, ownerId: string, draftId: string, body: { outputDigest: string; reviewed: true }) {
    enabled(); const draft = this.store.get(draftId, ownerId, projectId);
    if (body.reviewed !== true) throw new AppError(409, 'TRANSLATION_REVIEW_REQUIRED', 'Vui lòng xác nhận đã kiểm tra ngữ nghĩa.');
    if (body.outputDigest !== draft.outputDigest) throw new AppError(409, 'TRANSLATION_DRAFT_CHANGED', 'Bản nháp không khớp nội dung đã duyệt.');
    return this.store.approve(draftId, async () => {
      // Lost-response receipt: return the same approved record even if the workflow
      // has since advanced to TTS/result. Never regress Project state on a retry.
      const receipt = await Translation.findOne({ transcriptId: draft.transcriptId, projectId, targetLanguage: draft.targetLanguage });
      if (receipt) {
        const owner = await Project.findOne({ _id: projectId, userId: ownerId });
        if (!owner) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
        if (owner.sourceLanguage !== draft.sourceLanguage) throw mismatch();
        if (!await Language.exists({ code: draft.targetLanguage, isActive: true })) throw new AppError(400, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED', 'Ngôn ngữ đích chưa được hỗ trợ.');
        if (receipt.alignmentFormat !== 'GROUPS_V1' || String(receipt.review?.reviewedBy) !== ownerId || receipt.review?.outputDigest !== draft.outputDigest) throw exists();
        return { translation: await groupedDto(receipt) };
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
          if (revision(source) !== draft.sourceRevision || source.transcriptId !== draft.transcriptId) throw mismatch();
          assertStoredGroups(source, draft.groups);
          const current = await Translation.findOne({ transcriptId: source.transcriptId, targetLanguage: draft.targetLanguage }).session(session);
          if (current) {
            if (current.alignmentFormat !== 'GROUPS_V1' || String(current.review?.reviewedBy) !== ownerId || current.review?.outputDigest !== draft.outputDigest) throw exists();
            assertApprovedCurrent(current, source); saved = current; return;
          }
          this.store.get(draftId, ownerId, projectId);
          const [record] = await Translation.create([{ projectId, transcriptId: source.transcriptId, sourceLanguage: source.languageCode, targetLanguage: draft.targetLanguage,
            fullText: draft.groups.map(g => g.translatedText).join(' '), status: 'READY', alignmentFormat: 'GROUPS_V1', sourceRevision: draft.sourceRevision, groupingVersion: GROUPING_VERSION,
            groups: draft.groups, review: { reviewedBy: ownerId, reviewedAt: new Date(), sourceRevision: draft.sourceRevision, outputDigest: draft.outputDigest, method: 'MANUAL_V1' } }], { session });
          if (!record) throw new AppError(500, 'TRANSLATION_SAVE_FAILED', 'Không thể lưu bản dịch.'); saved = record;
        });
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw exists();
        throw error;
      } finally { await session.endSession(); }
      if (!saved) throw new AppError(500, 'TRANSLATION_SAVE_FAILED', 'Không thể lưu bản dịch.');
      return { translation: await groupedDto(saved) };
    });
  }
}
export const groupTranslationService = new GroupTranslationService();
